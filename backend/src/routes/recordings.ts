import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import recordingService from '../services/RecordingService';
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

// Upload audio file
router.post('/upload', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Get file information
    const { filename, originalname, size, mimetype } = req.file;
    
    // Create recording record in database
    const recordingData = {
      filename,
      originalFilename: originalname,
      // Persist a web-accessible relative path rather than an absolute FS path
      filePath: `/files/${filename}`,
      fileSize: size,
      format: path.extname(originalname).slice(1).toUpperCase(),
      mimeType: mimetype,
      createdAt: new Date(),
      // Audio metadata will be extracted later if needed
      duration: 0,
      sampleRate: 0,
      channels: 0
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
