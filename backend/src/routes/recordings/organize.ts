import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import { alignerService } from '../../services/AlignerService';
import { sanitizeTranscript } from '../../utils/textUtils';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireRecordingWriteAccess } from '../../middleware/auth';
import { badRequest } from '../../utils/errors';
import { getPreferredLang } from '../../utils/lang';
import { getFilesBaseDir, makeRelativeToBase } from '../../utils/filePaths';
import { findRecordingFilePath, findRecordingWorkingFilePath } from '../../utils/recordingHelpers';
import { createChatCompletion } from '../../utils/openai';

const router = Router({ mergeParams: true });

// Compose organized speeches: diarized segments + aligned tokens + polished text
router.post(
  '/',
  requireRecordingWriteAccess(),
  asyncHandler(async (req: Request, res: Response) => {
    const { recordingId } = req.params;

    const recording = await recordingService.getRecordingById(recordingId);

    // Reset previous result immediately so stale data never merges with the new run
    await recordingService.updateRecording(recordingId, { organizedSpeeches: [] });

    const baseDir = getFilesBaseDir();
    const absolutePath =
      (await findRecordingWorkingFilePath(baseDir, recording._id?.toString?.() ?? String(recording._id), recording.format)) ||
      (await findRecordingFilePath(baseDir, recording._id?.toString?.() ?? String(recording._id), recording.format));
    if (!absolutePath) {
      throw badRequest('Recording file path is missing', 'organize.file_missing');
    }
    const filePath = makeRelativeToBase(baseDir, absolutePath);

    const sourceText = recording.transcription || recording.verbatimTranscript || '';
    if (!sourceText.trim()) {
      throw badRequest('No transcription available to organize', 'organize.transcription_missing');
    }

    let speakerSegments = recording.speakerSegments || [];
    if (!Array.isArray(speakerSegments) || speakerSegments.length === 0) {
      const { segmentRecording } = await import('../../services/RecordingService');
      const result = await segmentRecording(recordingId);
      speakerSegments = result.segments || [];
    }

    if (!Array.isArray(speakerSegments) || speakerSegments.length === 0) {
      throw badRequest('Speaker segmentation not available', 'organize.segmentation_missing');
    }

    const cleaned = sanitizeTranscript(sourceText);
    const transcriptionChunks = recording.transcriptionChunks;
    const chunkTexts = Array.isArray(transcriptionChunks)
      ? transcriptionChunks.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : undefined;

    const alignmentResult = await alignerService.alignAudioWithText({ audioFilePath: filePath, text: cleaned, chunkTexts });
    console.log('alignmentResult:\n', JSON.stringify(alignmentResult, null, 2));
    const first = Array.isArray(alignmentResult.alignments) && alignmentResult.alignments.length > 0 ? alignmentResult.alignments[0] : null;

    if (!first || !Array.isArray(first.timestamp)) {
      throw badRequest('Alignment failed to produce timestamps', 'organize.alignment_failed');
    }

    const words = (first.text || '').split(/\s+/).filter(Boolean);
    const timestamps = (first.timestamp || []).map((pair) => (Array.isArray(pair) && pair.length >= 2 ? [Number(pair[0]), Number(pair[1])] : [0, 0]));
    const tokens = words
      .map((w, idx) => ({
        text: w,
        startMs: Number(timestamps[idx]?.[0] || 0),
        endMs: Number(timestamps[idx]?.[1] || 0),
      }))
      .filter((t) => Number.isFinite(t.startMs) && Number.isFinite(t.endMs) && t.endMs > t.startMs);

    const speeches = speakerSegments
      .map((seg) => {
        const segStartMs = Math.max(0, Math.round(seg.startTime * 1000));
        const segEndMs = Math.max(segStartMs, Math.round(seg.endTime * 1000));
        const overlapping = tokens.filter((tok) => tok.endMs > segStartMs && tok.startMs < segEndMs);
        const rawText = overlapping
          .map((t) => t.text)
          .join(' ')
          .trim();
        return {
          speakerIndex: seg.speakerIndex,
          startTime: seg.startTime,
          endTime: seg.endTime,
          rawText,
        };
      })
      .filter((s) => s.rawText.length > 0);

    let polishedById: Record<string, string> = {};

    const fallbackPolish = (text: string): string => {
      const trimmed = text.trim();
      const singleSpaced = trimmed.replace(/\s+/g, ' ');
      return singleSpaced.length > 0 ? singleSpaced.charAt(0).toUpperCase() + singleSpaced.slice(1) : singleSpaced;
    };

    if (speeches.length > 0) {
      try {
        const items = speeches.map((s, idx) => ({ id: String(idx), text: s.rawText }));
        const userPayload = {
          instruction:
            'Polish each text: fix punctuation, casing, remove fillers, keep language and meaning. Return JSON with items: [{id, polishedText}] only.',
          items,
        };
        const completion = await createChatCompletion({
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'You are a precise editor. Improve readability while preserving meaning. Correct some segment errors. Do not translate. Always respond with valid JSON only, no markdown.' },
            { role: 'user', content: JSON.stringify(userPayload) },
          ],
        });
        const raw = completion.choices?.[0]?.message?.content || '';
        // Strip optional markdown code fences and extract the JSON object
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        const content = jsonMatch ? jsonMatch[0] : raw;
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(content);
        } catch (parseErr) {
          console.error('[organize] failed to parse OpenAI response as JSON:', parseErr, '| raw:', raw.slice(0, 200));
        }
        const outItems = Array.isArray((parsed as any)?.items) ? (parsed as any).items : [];
        const map: Record<string, string> = {};
        outItems.forEach((it: any) => {
          const id = String(it?.id ?? '');
          const polished = typeof it?.polishedText === 'string' ? it.polishedText : '';
          if (id) map[id] = polished;
        });
        polishedById = map;
      } catch (err) {
        console.error('[organize] polishing step failed:', err instanceof Error ? err.message : err);
        polishedById = {};
      }
    }

    const organized = speeches.map((s, idx) => ({
      speakerIndex: s.speakerIndex,
      startTime: s.startTime,
      endTime: s.endTime,
      rawText: s.rawText,
      polishedText: polishedById[String(idx)] || fallbackPolish(s.rawText),
    }));

    const lang = getPreferredLang(req);
    res.json({ speeches: organized, message: lang === 'en' ? 'Organization completed' : '整理完成' });
  })
);

export default router;
