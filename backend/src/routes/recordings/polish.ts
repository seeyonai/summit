import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';

const router = Router();

// Polish/optimize transcription using AI
router.post('/', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    const result = await recordingService.polishTranscription(recordingId);
    res.json(result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to polish transcription' 
    });
  }
});

export default router;