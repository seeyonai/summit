import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireRecordingWriteAccess } from '../../middleware/auth';
import { getPreferredLang } from '../../utils/lang';

const router = Router({ mergeParams: true });

// Polish/optimize transcription using AI
router.post('/', requireRecordingWriteAccess(), asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params;
  const result = await recordingService.polishTranscription(recordingId);
  const lang = getPreferredLang(req);
  res.json({ ...result, message: lang === 'en' ? 'Transcription polished' : '转录优化成功' });
}));

export default router;
