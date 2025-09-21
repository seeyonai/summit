import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import recordingService from '../services/RecordingService';
import OpenAI from 'openai';
import { alignerService } from '../services/AlignerService';
import { parseFile } from 'music-metadata';
import { RecordingUpdate } from '../types';

const router = Router();

// Ensure files directory exists (storage for uploaded audio)
// Note: __dirname here is backend/src/routes; we need repo-root /files
const filesDir = path.join(__dirname, '..', '..', '..', 'files');
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${timestamp}${ext}`);
  }
});

// File filter for audio files only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/webm',
    'audio/m4a',
    'audio/x-m4a'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

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
    
    // Extract audio metadata using music-metadata
    const metadata: {
      duration?: number;
      sampleRate?: number;
      channels?: number;
      bitrate?: number | null;
      codec?: string | null;
      container?: string | null;
      title?: string | null;
      artist?: string | null;
      album?: string | null;
      year?: number | null;
      genre?: string[] | null;
    } = {};
    
    if (recording.filePath) {
      try {
        // Construct absolute path from stored relative path
        const absolutePath = path.join(__dirname, '..', '..', '..', recording.filePath);
        
        if (fs.existsSync(absolutePath)) {
          const audioMetadata = await parseFile(absolutePath);
          
          // Extract relevant metadata fields
          metadata.duration = typeof audioMetadata.format.duration === 'number' && Number.isFinite(audioMetadata.format.duration)
            ? audioMetadata.format.duration
            : 0;
          metadata.sampleRate = typeof audioMetadata.format.sampleRate === 'number' && Number.isFinite(audioMetadata.format.sampleRate)
            ? audioMetadata.format.sampleRate
            : 0;
          metadata.channels = typeof audioMetadata.format.numberOfChannels === 'number' && Number.isFinite(audioMetadata.format.numberOfChannels)
            ? audioMetadata.format.numberOfChannels
            : 0;
          metadata.bitrate = audioMetadata.format.bitrate || null;
          metadata.codec = audioMetadata.format.codec || null;
          metadata.container = audioMetadata.format.container || null;
          
          // Extract common metadata if available
          if (audioMetadata.common) {
            metadata.title = audioMetadata.common.title || null;
            metadata.artist = audioMetadata.common.artist || null;
            metadata.album = audioMetadata.common.album || null;
            metadata.year = audioMetadata.common.year || null;
            metadata.genre = audioMetadata.common.genre || null;
          }
        }
      } catch (error) {
        // If metadata parsing fails, continue with empty metadata
        console.warn(`Failed to parse metadata for recording ${recordingId}:`, error);
      }
    }
    
    res.json({...recording, metadata});
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

function sanitizeTranscript(text: string): string {
  // Remove punctuation and non-audible symbols; keep letters, numbers, and whitespace
  return text
    .replace(/[\p{P}]+/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Align transcript with audio for a recording
router.post('/:recordingId/align', async (req: Request, res: Response) => {
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

// Compose organized speeches: diarized segments + aligned tokens + polished text
router.post('/:recordingId/organize', async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;

    const recording = await recordingService.getRecordingById(recordingId);
    const filePath = recording.filePath || recording.filename;
    if (!filePath) {
      return res.status(400).json({ error: 'Recording file path is missing' });
    }

    const sourceText = recording.transcription || recording.verbatimTranscript || '';
    if (!sourceText.trim()) {
      return res.status(400).json({ error: 'No transcription available to organize' });
    }

    // Ensure diarization segments are available
    let speakerSegments = recording.speakerSegments || [];
    if (!Array.isArray(speakerSegments) || speakerSegments.length === 0) {
      const { segmentRecording } = await import('../services/RecordingService');
      const result = await segmentRecording(recordingId);
      speakerSegments = result.segments || [];
    }

    if (!Array.isArray(speakerSegments) || speakerSegments.length === 0) {
      return res.status(400).json({ error: 'Speaker segmentation not available' });
    }

    // Align audio and text to get per-token timestamps
    const cleaned = sanitizeTranscript(sourceText);
    const alignmentResult = await alignerService.alignAudioWithText({ audioFilePath: filePath, text: cleaned });
    const first = Array.isArray(alignmentResult.alignments) && alignmentResult.alignments.length > 0
      ? alignmentResult.alignments[0]
      : null;

    if (!first || !Array.isArray(first.timestamp)) {
      return res.status(400).json({ error: 'Alignment failed to produce timestamps' });
    }

    const words = (first.text || '').split(/\s+/).filter(Boolean);
    const timestamps = (first.timestamp || []).map((pair) => Array.isArray(pair) && pair.length >= 2 ? [Number(pair[0]), Number(pair[1])] : [0, 0]);
    const tokens = words.map((w, idx) => ({
      text: w,
      startMs: Number(timestamps[idx]?.[0] || 0),
      endMs: Number(timestamps[idx]?.[1] || 0),
    })).filter((t) => Number.isFinite(t.startMs) && Number.isFinite(t.endMs) && t.endMs > t.startMs);

    // Build raw text per diarized segment by collecting overlapping tokens
    const speeches = speakerSegments.map((seg) => {
      const segStartMs = Math.max(0, Math.round(seg.startTime * 1000));
      const segEndMs = Math.max(segStartMs, Math.round(seg.endTime * 1000));
      const overlapping = tokens.filter((tok) => tok.endMs > segStartMs && tok.startMs < segEndMs);
      const rawText = overlapping.map((t) => t.text).join(' ').trim();
      return {
        speakerIndex: seg.speakerIndex,
        startTime: seg.startTime,
        endTime: seg.endTime,
        rawText,
      };
    }).filter((s) => s.rawText.length > 0);

    // Polish texts using OpenAI if available; otherwise fall back to simple polish
    const apiKey = process.env.SUMMIT_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.SUMMIT_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;
    let polishedById: Record<string, string> = {};

    const fallbackPolish = (text: string): string => {
      const trimmed = text.trim();
      const singleSpaced = trimmed.replace(/\s+/g, ' ');
      return singleSpaced.length > 0 ? singleSpaced.charAt(0).toUpperCase() + singleSpaced.slice(1) : singleSpaced;
    };

    if (apiKey && speeches.length > 0) {
      try {
        const client = new OpenAI({ apiKey, baseURL: baseUrl });
        const items = speeches.map((s, idx) => ({ id: String(idx), text: s.rawText }));
        const userPayload = {
          instruction: 'Polish each text: fix punctuation, casing, remove fillers, keep language and meaning. Return JSON with items: [{id, polishedText}] only.',
          items,
        };
        const completion = await client.chat.completions.create({
          model: process.env.SUMMIT_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a precise editor. Improve readability while preserving meaning. Do not translate.' },
            { role: 'user', content: JSON.stringify(userPayload) },
          ],
        });
        const content = completion.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(content);
        const outItems = Array.isArray(parsed?.items) ? parsed.items : [];
        const map: Record<string, string> = {};
        outItems.forEach((it: any) => {
          const id = String(it?.id ?? '');
          const polished = typeof it?.polishedText === 'string' ? it.polishedText : '';
          if (id) map[id] = polished;
        });
        polishedById = map;
      } catch (_) {
        // Fallback
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

    res.json({ speeches: organized, message: '组织完成' });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error instanceof Error ? error.message : 'Failed to organize recording' 
    });
  }
});

// Upload audio file
router.post('/upload', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Get file information
    const { filename, originalname, size, mimetype } = req.file;

    // Build absolute path to the saved file (multer -> DiskStorage)
    const absolutePath = path.join(filesDir, filename);

    // Extract audio metadata using music-metadata
    let duration = 0;
    let sampleRate = 0;
    let channels = 0;
    let detectedFormat: string | undefined;

    try {
      const metadata = await parseFile(absolutePath);
      duration = typeof metadata.format.duration === 'number' && Number.isFinite(metadata.format.duration)
        ? metadata.format.duration
        : 0;
      sampleRate = typeof metadata.format.sampleRate === 'number' && Number.isFinite(metadata.format.sampleRate)
        ? metadata.format.sampleRate
        : 0;
      channels = typeof metadata.format.numberOfChannels === 'number' && Number.isFinite(metadata.format.numberOfChannels)
        ? metadata.format.numberOfChannels
        : 0;

      const container = metadata.format.container || '';
      const codec = metadata.format.codec || '';
      const ext = path.extname(filename).replace(/^\./, '').toLowerCase();

      // Best-effort mapping to a concise format label
      const mapContainerToFormat = (c: string, co: string, fallbackExt: string): string => {
        const cUp = c.toUpperCase();
        const coUp = co.toUpperCase();
        if (cUp.includes('WAVE') || cUp === 'WAV') return 'wav';
        if (cUp.includes('FLAC')) return 'flac';
        if (cUp.includes('AIFF') || cUp.includes('AIF')) return 'aiff';
        if (cUp.includes('WEBM')) return 'webm';
        if (cUp.includes('OGG') || cUp.includes('OGA')) return 'ogg';
        if (cUp.includes('MPEG-4') || cUp.includes('MP4')) return fallbackExt === 'm4a' ? 'm4a' : (fallbackExt || 'm4a');
        if (cUp.includes('MPEG')) {
          if (coUp.includes('MP3') || coUp.includes('MPEG LAYER 3')) return 'mp3';
          return fallbackExt || 'mpeg';
        }
        return fallbackExt || c || 'unknown';
      };

      detectedFormat = mapContainerToFormat(container, codec, ext);
    } catch (mmError) {
      // If metadata parsing fails, proceed with fallbacks
      const ext = path.extname(filename).replace(/^\./, '').toLowerCase();
      detectedFormat = ext || 'unknown';
    }
    
    // Create recording record in database
    const recordingData = {
      filename,
      originalFilename: originalname,
      // Persist a web-accessible relative path rather than an absolute FS path
      filePath: `/files/${filename}`,
      fileSize: size,
      format: (detectedFormat || '').toLowerCase(),
      mimeType: mimetype,
      createdAt: new Date(),
      // Store parsed audio metadata
      duration,
      sampleRate,
      channels
    };

    const result = await recordingService.createRecording(recordingData);
    
    res.status(201).json({
      message: '文件上传成功',
      recording: result
    });
  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload file' 
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'Recording Management Service' });
});

export default router;
