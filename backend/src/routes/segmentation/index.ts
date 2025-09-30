import { Router, Request, Response } from 'express';
import { SegmentationService } from '../../services/SegmentationService';
import { SegmentationRequest } from '../../types';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest } from '../../utils/errors';

const router = Router();
const segmentationService = new SegmentationService();

// Get segmentation model information
router.get('/model-info', asyncHandler(async (req: Request, res: Response) => {
  const modelInfo = await segmentationService.getModelInfo();
  res.json(modelInfo);
}));

// Analyze audio file for speaker segmentation
router.post('/analyze', asyncHandler(async (req: Request, res: Response) => {
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
    throw badRequest('audioFilePath is required', 'segmentation.audio_required');
  }

  const oracleNumSpeakersValue = camelCaseOracle ?? snakeCaseOracle;
  const parsedOracle = typeof oracleNumSpeakersValue !== 'undefined'
    ? parseInt(String(oracleNumSpeakersValue), 10)
    : undefined;

  if (typeof parsedOracle !== 'undefined' && Number.isNaN(parsedOracle)) {
    throw badRequest('oracleNumSpeakers must be a number', 'segmentation.invalid_oracle');
  }

  const returnTextRaw = camelCaseReturn ?? snakeCaseReturn;
  const returnText = typeof returnTextRaw === 'undefined'
    ? undefined
    : typeof returnTextRaw === 'string'
      ? returnTextRaw.toLowerCase() === 'true'
      : Boolean(returnTextRaw);

  const request: SegmentationRequest = {
    audioFilePath,
    oracleNumSpeakers: typeof parsedOracle === 'number' ? parsedOracle : undefined,
    returnText,
  };

  const result = await segmentationService.analyzeSegmentation(request);
  res.json(result);
}));

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'Speaker Segmentation Service' });
});

export default router;
