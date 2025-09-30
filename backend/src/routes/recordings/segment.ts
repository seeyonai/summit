import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest } from '../../utils/errors';

const router = Router({ mergeParams: true });

// Run speaker diarization on a recording
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params; // recordingId is undefined?
  const { oracleNumSpeakers: camelCaseOracle, oracle_num_speakers: snakeCaseOracle } = req.body as Record<string, unknown>;
  const oracleNumSpeakersValue = camelCaseOracle ?? snakeCaseOracle;
  const parsedValue = typeof oracleNumSpeakersValue !== 'undefined'
    ? parseInt(String(oracleNumSpeakersValue), 10)
    : undefined;

  if (typeof parsedValue !== 'undefined' && Number.isNaN(parsedValue)) {
    throw badRequest('oracleNumSpeakers must be a number', 'segmentation.invalid_oracle');
  }

  const result = await recordingService.segmentRecording(
    recordingId,
    typeof parsedValue === 'number' ? parsedValue : undefined
  );
  res.json(result);
}));

export default router;
