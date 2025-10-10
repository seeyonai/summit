import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import { alignerService } from '../../services/AlignerService';
import { RecordingUpdate } from '../../types';
import { sanitizeTranscript } from '../../utils/textUtils';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireRecordingWriteAccess } from '../../middleware/auth';
import { badRequest } from '../../utils/errors';
import { getPreferredLang } from '../../utils/lang';
import { getFilesBaseDir, makeRelativeToBase } from '../../utils/filePaths';
import { findRecordingFilePath } from '../../utils/recordingHelpers';

const router = Router({ mergeParams: true });

// Align transcript with audio for a recording
router.post('/', requireRecordingWriteAccess(), asyncHandler(async (req: Request, res: Response) => {
  const { recordingId } = req.params;
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw badRequest('text is required', 'alignment.text_required');
  }

  const recording = await recordingService.getRecordingById(recordingId);
  const baseDir = getFilesBaseDir();
  const absolutePath = await findRecordingFilePath(baseDir, recording._id?.toString?.() ?? String(recording._id), recording.format);
  if (!absolutePath) {
    throw badRequest('Recording file path is missing', 'alignment.file_missing');
  }
  const filePath = makeRelativeToBase(baseDir, absolutePath);

  const cleaned = sanitizeTranscript(text);
  if (!cleaned) {
    throw badRequest('text content is empty after sanitization', 'alignment.text_empty');
  }

  const result = await alignerService.alignAudioWithText({ audioFilePath: filePath, text: cleaned });

  if (result.success && result.alignments && result.alignments.length > 0) {
    const updateData: RecordingUpdate = {
      alignmentItems: result.alignments
    };
    await recordingService.updateRecording(recordingId, updateData);
  }

  const lang = getPreferredLang(req);
  res.json({ ...result, message: lang === 'en' ? 'Alignment completed' : '对齐完成' });
}));

export default router;
