import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';

const router = Router();

// Generate transcription for a recording
router.post('/', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    const { hotword } = req.body;
    const result = await recordingService.transcribeRecording(recordingId, hotword);
    res.json(result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to transcribe recording' 
    });
  }
});

export default router;