import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';

const router = Router();

// Run speaker diarization on a recording
router.post('/', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    const { oracleNumSpeakers: camelCaseOracle, oracle_num_speakers: snakeCaseOracle } = req.body as Record<string, unknown>;
    const oracleNumSpeakersValue = camelCaseOracle ?? snakeCaseOracle;
    const oracleNumSpeakers = typeof oracleNumSpeakersValue !== 'undefined'
      ? parseInt(String(oracleNumSpeakersValue), 10)
      : undefined;

    const result = await recordingService.segmentRecording(
      recordingId,
      Number.isNaN(oracleNumSpeakers) ? undefined : oracleNumSpeakers
    );
    res.json(result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to segment recording' 
    });
  }
});

export default router;