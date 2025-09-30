import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import { alignerService } from '../../services/AlignerService';
import { RecordingUpdate } from '../../types';
import { sanitizeTranscript } from '../../utils/textUtils';

const router = Router();

// Align transcript with audio for a recording
router.post('/', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;
    const { text } = req.body as { text?: string };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }

    const recording = await recordingService.getRecordingById(recordingId);
    const filePath = recording.filePath || recording.filename;
    if (!filePath) {
      return res.status(400).json({ error: 'Recording file path is missing' });
    }

    const cleaned = sanitizeTranscript(text);
    if (!cleaned) {
      return res.status(400).json({ error: 'text content is empty after sanitization' });
    }

    const result = await alignerService.alignAudioWithText({ audioFilePath: filePath, text: cleaned });
    
    // Save alignment results to database
    if (result.success && result.alignments && result.alignments.length > 0) {
      const updateData: RecordingUpdate = {
        alignmentItems: result.alignments
      };
      await recordingService.updateRecording(recordingId, updateData);
    }
    
    res.json(result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to align recording' 
    });
  }
});

export default router;
