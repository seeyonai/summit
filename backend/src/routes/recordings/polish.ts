import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router({ mergeParams: true });

// Polish/optimize transcription using AI
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params;
  const result = await recordingService.polishTranscription(recordingId);
  res.json(result);
}));

export default router;
