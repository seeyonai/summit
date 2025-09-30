import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import path from 'path';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import { RecordingUpdate } from '../../types';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest } from '../../utils/errors';
import type { RequestWithUser } from '../../types/auth';
import { requireRecordingReadAccess, requireRecordingWriteAccess } from '../../middleware/auth';

const router = Router();

// Get all recordings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const r = req as RequestWithUser;
  if (!r.user) {
    throw badRequest('Unauthorized', 'auth.unauthorized');
  }
  const recordings = await recordingService.getRecordingsForUser(r.user.userId);
  res.json(recordings);
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

  if (recording.filePath) {
    try {
      const absolutePath = path.join(__dirname, '..', '..', recording.filePath);

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
  const result = await recordingService.startRecording();
  res.status(201).json(result);
}));

// Update recording metadata and transcription
router.put('/:recordingId', requireRecordingWriteAccess(), asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params;
  const updateData: RecordingUpdate = req.body;

  if (updateData.organizedSpeeches && !Array.isArray(updateData.organizedSpeeches)) {
    throw badRequest('organizedSpeeches must be an array', 'recording.invalid_payload');
  }

  const result = await recordingService.updateRecording(recordingId, updateData);
  res.json(result);
}));

// Delete a recording
router.delete('/:recordingId', requireRecordingWriteAccess(), asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params;
  const result = await recordingService.deleteRecording(recordingId);
  res.json(result);
}));

export default router;
