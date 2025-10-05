import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import path from 'path';
import fs from 'fs';
import { getFilesBaseDir, resolveExistingPathFromCandidate } from '../../utils/filePaths';
import { parseFile } from 'music-metadata';
import { RecordingUpdate } from '../../types';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest } from '../../utils/errors';
import type { RequestWithUser } from '../../types/auth';
import { requireRecordingReadAccess, requireRecordingWriteAccess } from '../../middleware/auth';
import { getPreferredLang } from '../../utils/lang';

const router = Router();

// Get recordings (default limit 100; use ?all=true to fetch all)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const r = req as RequestWithUser;
  if (!r.user) {
    throw badRequest('Unauthorized', 'auth.unauthorized');
  }
  const all = typeof req.query.all === 'string' && ['true', '1', 'yes'].includes(req.query.all.toLowerCase());
  const desired = all ? 'all' : 101;
  const list = r.user.role === 'admin'
    ? await recordingService.getAllRecordings(desired)
    : await recordingService.getRecordingsForUser(r.user.userId, true, desired);
  const overLimit = !all && list.length > 100;
  const recordings = overLimit ? list.slice(0, 100) : list;
  const fetchedAll = all || !overLimit;
  res.json({ recordings, fetchedAll });
}));

// Get a specific recording by ID
router.get('/:recordingId', requireRecordingReadAccess(), asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params;
  const recording = await recordingService.getRecordingById(recordingId);

  const metadata: {
    duration?: number;
    sampleRate?: number;
    channels?: number;
    bitrate?: number | null;
    codec?: string | null;
    container?: string | null;
    title?: string | null;
    artist?: string | null;
    album?: string | null;
    year?: number | null;
    genre?: string[] | null;
  } = {};

  if (recording._id) {
    try {
      const baseDir = getFilesBaseDir();
      const ext = recording.format || 'wav';
      const absolutePath = await resolveExistingPathFromCandidate(baseDir, `${recording._id}.${ext}`);

      if (fs.existsSync(absolutePath)) {
        const audioMetadata = await parseFile(absolutePath);

        metadata.duration = typeof audioMetadata.format.duration === 'number' && Number.isFinite(audioMetadata.format.duration)
          ? audioMetadata.format.duration
          : 0;
        metadata.sampleRate = typeof audioMetadata.format.sampleRate === 'number' && Number.isFinite(audioMetadata.format.sampleRate)
          ? audioMetadata.format.sampleRate
          : 0;
        metadata.channels = typeof audioMetadata.format.numberOfChannels === 'number' && Number.isFinite(audioMetadata.format.numberOfChannels)
          ? audioMetadata.format.numberOfChannels
          : 0;
        metadata.bitrate = audioMetadata.format.bitrate || null;
        metadata.codec = audioMetadata.format.codec || null;
        metadata.container = audioMetadata.format.container || null;

        if (audioMetadata.common) {
          metadata.title = audioMetadata.common.title || null;
          metadata.artist = audioMetadata.common.artist || null;
          metadata.album = audioMetadata.common.album || null;
          metadata.year = audioMetadata.common.year || null;
          metadata.genre = audioMetadata.common.genre || null;
        }
      }
    } catch (error) {
      console.warn(`Failed to parse metadata for recording ${recordingId}:`, error);
    }
  }

  res.json({ ...recording, metadata });
}));

// Start a new recording session
router.post('/start', asyncHandler(async (req: Request, res: Response) => {
  const r = req as unknown as Request & { user?: { userId: string } };
  if (!r.user?.userId) {
    throw badRequest('Unauthorized', 'auth.unauthorized');
  }
  const meetingId = typeof req.query.meetingId === 'string' ? req.query.meetingId : undefined;
  const result = await recordingService.startRecording(r.user.userId, meetingId);
  const lang = getPreferredLang(req);
  res.status(201).json({ ...result, message: lang === 'en' ? 'Recording started' : '录音已开始' });
}));

// Update recording metadata and transcription
router.put('/:recordingId', requireRecordingWriteAccess(), asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params;
  const updateData: RecordingUpdate = req.body;

  if (updateData.organizedSpeeches && !Array.isArray(updateData.organizedSpeeches)) {
    throw badRequest('organizedSpeeches must be an array', 'recording.invalid_payload');
  }

  // Validate speakerNames if provided
  if (updateData.speakerNames !== undefined) {
    if (!Array.isArray(updateData.speakerNames)) {
      throw badRequest('speakerNames must be an array', 'recording.invalid_payload');
    }

    for (const entry of updateData.speakerNames) {
      if (typeof entry !== 'object' || entry === null) {
        throw badRequest('Each speakerName entry must be an object', 'recording.invalid_payload');
      }

      if (typeof entry.index !== 'number' || entry.index < 0 || !Number.isInteger(entry.index)) {
        throw badRequest('speakerName index must be a non-negative integer', 'recording.invalid_payload');
      }

      if (typeof entry.name !== 'string') {
        throw badRequest('speakerName name must be a string', 'recording.invalid_payload');
      }

      const trimmedName = entry.name.trim();
      if (trimmedName.length === 0) {
        throw badRequest('speakerName name cannot be empty or whitespace-only', 'recording.invalid_payload');
      }

      // Normalize the name (trim whitespace)
      entry.name = trimmedName;
    }
  }

  const result = await recordingService.updateRecording(recordingId, updateData);
  const lang = getPreferredLang(req);
  let message = result.message;
  if (message === 'Recording updated' || message === '录音更新成功') {
    message = lang === 'en' ? 'Recording updated' : '录音更新成功';
  } else if (message === 'No changes applied' || message === '未应用任何更改') {
    message = lang === 'en' ? 'No changes applied' : '未应用任何更改';
  }
  res.json({ ...result, message });
}));

// Delete a recording
router.delete('/:recordingId', requireRecordingWriteAccess(), asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params;
  const result = await recordingService.deleteRecording(recordingId);
  const lang = getPreferredLang(req);
  res.json({ ...result, message: lang === 'en' ? 'Recording deleted' : '录音删除成功' });
}));

export default router;
