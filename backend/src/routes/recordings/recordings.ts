import { Router, Request, Response } from 'express';
import recordingService from '../../services/RecordingService';
import path from 'path';
import fs from 'fs';
import { parseFile } from 'music-metadata';
import { RecordingUpdate } from '../../types';

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
        const absolutePath = path.join(__dirname, '..', '..', recording.filePath);
        
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

export default router;