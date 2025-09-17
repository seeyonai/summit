import { Router, Request, Response } from 'express';
import recordingService from '../services/RecordingService';
import { RecordingUpdate } from '../types';

const router = Router();

// Get all recordings
router.get('/', async (req: Request, res: Response) => {
  try {
    const recordings = await recordingService.getAllRecordings();
    res.json(recordings);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch recordings' 
    });
  }
});

// Get a specific recording by ID
router.get('/:recordingId', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    const recording = await recordingService.getRecordingById(recordingId);
    res.json(recording);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch recording' 
    });
  }
});

// Start a new recording session
router.post('/start', async (req: Request, res: Response) => {
  try {
    const result = await recordingService.startRecording();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to start recording' 
    });
  }
});

// Update recording metadata and transcription
router.put('/:recordingId', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    const updateData: RecordingUpdate = req.body;
    
    const result = await recordingService.updateRecording(recordingId, updateData);
    res.json(result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to update recording' 
    });
  }
});

// Delete a recording
router.delete('/:recordingId', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    const result = await recordingService.deleteRecording(recordingId);
    res.json(result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete recording' 
    });
  }
});

// Generate transcription for a recording
router.post('/:recordingId/transcribe', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    const result = await recordingService.transcribeRecording(recordingId);
    res.json(result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to transcribe recording' 
    });
  }
});

// Run speaker diarization on a recording
router.post('/:recordingId/segment', async (req: Request, res: Response) => {
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

// Polish/optimize transcription using AI
router.post('/:recordingId/polish', async (req: Request, res: Response) => {
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

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'Recording Management Service' });
});

export default router;
