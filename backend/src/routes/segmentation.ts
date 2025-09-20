import { Router, Request, Response } from 'express';
import { SegmentationService } from '../services/SegmentationService';
import { SegmentationRequest } from '../types';

const router = Router();
const segmentationService = new SegmentationService();

// Get segmentation model information
router.get('/model-info', async (req: Request, res: Response) => {
  try {
    const modelInfo = await segmentationService.getModelInfo();
    res.json(modelInfo);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get model information' });
  }
});

// Analyze audio file for speaker segmentation
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const {
      audioFilePath: camelCasePath,
      audio_file_path: snakeCasePath,
      oracleNumSpeakers: camelCaseOracle,
      oracle_num_speakers: snakeCaseOracle,
      returnText: camelCaseReturn,
      return_text: snakeCaseReturn,
    } = req.body as Record<string, unknown>;

    const audioFilePath = (camelCasePath || snakeCasePath) as string | undefined;

    if (!audioFilePath) {
      return res.status(400).json({ error: 'audioFilePath is required' });
    }

    const oracleNumSpeakersValue = camelCaseOracle ?? snakeCaseOracle;
    const oracleNumSpeakers = typeof oracleNumSpeakersValue !== 'undefined'
      ? parseInt(String(oracleNumSpeakersValue), 10)
      : undefined;
    const returnTextRaw = camelCaseReturn ?? snakeCaseReturn;
    const returnText = typeof returnTextRaw === 'undefined'
      ? undefined
      : typeof returnTextRaw === 'string'
        ? returnTextRaw.toLowerCase() === 'true'
        : Boolean(returnTextRaw);

    const request: SegmentationRequest = {
      audioFilePath,
      oracleNumSpeakers: Number.isNaN(oracleNumSpeakers) ? undefined : oracleNumSpeakers,
      returnText,
    };

    const result = await segmentationService.analyzeSegmentation(request);
    res.json(result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze segmentation' 
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'Speaker Segmentation Service' });
});

export default router;
