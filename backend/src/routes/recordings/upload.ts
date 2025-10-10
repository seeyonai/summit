import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest, internal, forbidden } from '../../utils/errors';
import type { RequestWithUser } from '../../types/auth';
import { isOwner as isMeetingOwner } from '../../services/MeetingService';
import { getPreferredLang } from '../../utils/lang';
import recordingService from '../../services/RecordingService';
import { writeEncryptedFile } from '../../utils/audioEncryption';
import { buildRecordingFilename } from '../../utils/recordingHelpers';
import { setAuditContext } from '../../middleware/audit';

// Ensure files directory exists (storage for uploaded audio)
import { getFilesBaseDir } from '../../utils/filePaths';
const filesDir = getFilesBaseDir();
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${timestamp}${ext}`);
  }
});

// File filter for audio files only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/aac',
    'audio/x-aac',
    'audio/alac',
    'audio/x-ms-wma',
    'audio/wma',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp4',
    'audio/webm',
    'audio/flac',
    'audio/amr',
    'audio/g722',
    'audio/g72'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(badRequest('Invalid file type. Only audio files are allowed.', 'upload.invalid_type'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

const router = Router();

// Upload audio file
router.post('/', upload.single('audio'), asyncHandler(async (req: Request, res: Response) => {
  const r = req as RequestWithUser;
  if (!r.user?.userId) {
    throw badRequest('Unauthorized', 'auth.unauthorized');
  }
  if (!req.file) {
    throw badRequest('No audio file provided', 'upload.file_required');
  }

  const { filename: tempFilename, originalname, size, mimetype, path: tempPath } = req.file;
  const absolutePath = path.join(filesDir, tempFilename);

  let duration = 0;
  let sampleRate = 0;
  let channels = 0;
  let detectedFormat: string | undefined;

  try {
    const metadata = await parseFile(absolutePath);
    duration = typeof metadata.format.duration === 'number' && Number.isFinite(metadata.format.duration)
      ? metadata.format.duration
      : 0;
    sampleRate = typeof metadata.format.sampleRate === 'number' && Number.isFinite(metadata.format.sampleRate)
      ? metadata.format.sampleRate
      : 0;
    channels = typeof metadata.format.numberOfChannels === 'number' && Number.isFinite(metadata.format.numberOfChannels)
      ? metadata.format.numberOfChannels
      : 0;

    const container = metadata.format.container || '';
    const codec = metadata.format.codec || '';
    const ext = path.extname(tempFilename).replace(/^\./, '').toLowerCase();

    const mapContainerToFormat = (c: string, co: string, fallbackExt: string): string => {
      const cUp = c.toUpperCase();
      const coUp = co.toUpperCase();
      if (cUp.includes('WAVE') || cUp === 'WAV') return 'wav';
      if (cUp.includes('FLAC')) return 'flac';
      if (cUp.includes('AIFF') || cUp.includes('AIF')) return 'aiff';
      if (cUp.includes('WEBM')) return 'webm';
      if (cUp.includes('OGG') || cUp.includes('OGA')) return 'ogg';
      if (cUp.includes('MPEG-4') || cUp.includes('MP4')) return fallbackExt === 'm4a' ? 'm4a' : (fallbackExt || 'm4a');
      if (cUp.includes('MPEG')) {
        if (coUp.includes('MP3') || coUp.includes('MPEG LAYER 3')) return 'mp3';
        return fallbackExt || 'mpeg';
      }
      return fallbackExt || c || 'unknown';
    };

    detectedFormat = mapContainerToFormat(container, codec, ext);
  } catch (mmError) {
    const ext = path.extname(tempFilename).replace(/^\./, '').toLowerCase();
    detectedFormat = ext || 'unknown';
  }

  try {
    const meetingIdParam = typeof req.query.meetingId === 'string' ? req.query.meetingId : undefined;
    let meetingIdToAssign: string | undefined = undefined;
    if (meetingIdParam) {
      const owns = await isMeetingOwner(meetingIdParam, r.user.userId);
      if (!owns) {
        throw forbidden('Only meeting owner can attach recordings on upload', 'recording.attach_forbidden');
      }
      meetingIdToAssign = meetingIdParam;
    }
    const recordingData = {
      originalFileName: originalname,
      fileSize: size,
      format: (detectedFormat || '').toLowerCase(),
      mimeType: mimetype,
      createdAt: new Date(),
      duration,
      sampleRate,
      channels,
      ownerId: r.user.userId,
      meetingId: meetingIdToAssign,
    };

    const result = await recordingService.createRecording(recordingData);

    // Encrypt and persist uploaded file to final id-based filename
    try {
      const storedName = buildRecordingFilename(result._id.toString(), result.format);
      const finalPath = path.join(filesDir, storedName);
      const fileBuffer = await fs.promises.readFile(absolutePath);
      await writeEncryptedFile(finalPath, fileBuffer);
      await fs.promises.unlink(absolutePath).catch(() => undefined);
    } catch (moveErr) {
      console.error('Failed to persist encrypted recording file:', moveErr);
      throw internal('Failed to store encrypted audio file', 'upload.storage_failure');
    }

    const lang = getPreferredLang(req);
    setAuditContext(res, {
      action: 'recording_upload',
      resource: 'recording',
      resourceId: result._id.toString(),
      status: 'success',
      details: {
        meetingId: meetingIdToAssign,
        size,
        format: result.format,
      },
    });
    res.status(201).json({
      message: lang === 'en' ? 'File uploaded successfully' : '文件上传成功',
      recording: result
    });
  } catch (error) {
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        throw badRequest('File too large. Maximum size is 50MB.', 'upload.file_too_large');
      }
      throw badRequest(error.message, 'upload.failed');
    }

    if (error instanceof Error) {
      throw internal(error.message, 'upload.failed');
    }

    throw internal('Failed to upload file', 'upload.failed');
  }
}));

export default router;
