import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireRecordingWriteAccess } from '../../middleware/auth';
import { badRequest } from '../../utils/errors';

const router = Router({ mergeParams: true });

// Generate transcription for a recording
router.post('/', requireRecordingWriteAccess(), asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params;
  const { hotword } = req.body as { hotword?: unknown };

  if (hotword && typeof hotword !== 'string') {
    throw badRequest('hotword must be a string', 'transcription.invalid_hotword');
  }

  const trimmed = typeof hotword === 'string' ? hotword.trim() : undefined;
  const payload = trimmed && trimmed.length > 0 ? trimmed : undefined;
  const result = await recordingService.transcribeRecording(recordingId, payload);
  res.json(result);
}));

export default router;
