import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/database';
import { getFilesBaseDir } from './utils/filePaths';

// Load environment variables from .env file
dotenv.config({ quiet: true });
import { DataSeeder } from './utils/seedData';
import meetingsRouter from './routes/meetings';
import hotwordsRouter from './routes/hotwords';
import segmentationRouter from './routes/segmentation';
import alignerRouter from './routes/aligner';
import recordingsRouter from './routes/recordings/index';
import { LiveRecorderService } from './services/LiveRecorderService';
import { SEGMENTATION_SERVICE_URL } from './services/SegmentationService';
import { LIVE_SERVICE_BASE, TRANSCRIPTION_SERVICE_BASE } from './services/RecordingService';
import { ALIGNER_SERVICE_URL } from './services/AlignerService';

const app = express();
const PORT = process.env.PORT || 2591;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for audio files
// Resolve base directory for serving static recordings
const filesDir = getFilesBaseDir();
app.use('/files', express.static(filesDir));

// Routes
app.use('/api/meetings', meetingsRouter);
app.use('/api/hotwords', hotwordsRouter);
app.use('/api/segmentation', segmentationRouter);
app.use('/api/aligner', alignerRouter);
app.use('/api/recordings', recordingsRouter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const { getDb } = await import('./config/database');
    const db = getDb();
    await db.command({ ping: 1 });
    
    res.json({ 
      status: 'healthy', 
      service: 'Summit API', 
      port: PORT,
      database: 'connected'
    });
  } catch (error) {
    res.json({ 
      status: 'unhealthy', 
      service: 'Summit API', 
      port: PORT,
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Summit AI 后端 API',
    version: '1.0.0',
    service: 'Summit API Server',
    port: PORT,
    database: 'MongoDB',
    endpoints: {
      health: '/health',
      meetings: '/api/meetings',
      meetingsById: '/api/meetings/:id',
      meetingsByStatus: '/api/meetings/status/:status',
      upcomingMeetings: '/api/meetings/upcoming',
      hotwords: '/api/hotwords',
      hotwordsById: '/api/hotwords/:id',
      hotwordsBatch: '/api/hotwords/batch?ids=1,2,3',
      segmentation: '/api/segmentation',
      segmentationModelInfo: '/api/segmentation/model-info',
      segmentationAnalyze: '/api/segmentation/analyze',
      segmentationUpload: '/api/segmentation/upload',
      recordings: '/api/recordings',
      recordingsById: '/api/recordings/:id',
      recordingsStart: '/api/recordings/start',
      recordingsTranscribe: '/api/recordings/:id/transcribe',
      recordingsSegment: '/api/recordings/:id/segment',
      recordingsPolish: '/api/recordings/:id/polish',
      recordingsStatic: '/files/*'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found:' + req.url });
});

// Start server with database connection
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Seed data if environment variable is set
    if (!!process.env.SEED_DATA) {
      const seeder = new DataSeeder();
      await seeder.seedData();
    }
    
    // Check Echo Stream health
    let statusPort2592 = '✗ Not Ready';
    try {
      const response = await fetch(`${LIVE_SERVICE_BASE}health`);
      if (response.ok) {
        const healthStatus = await response.json();
        console.log('Echo Stream health check:', healthStatus);
        statusPort2592 = typeof healthStatus === 'object'
          && healthStatus !== null
          && 'status' in healthStatus
          && healthStatus.status === 'healthy' ? '✓ Ready' : '✗ Not Ready';
      }
    } catch (error) {
      console.error('Error getting health check status:', error);
    }

    // Check Echo Voices health
    let statusPort2593 = '✗ Not Ready';
    try {
      const response = await fetch(`${SEGMENTATION_SERVICE_URL}/health`);
      if (response.ok) {
        const healthStatus = await response.json();
        statusPort2593 = typeof healthStatus === 'object'
          && healthStatus !== null
          && 'status' in healthStatus
          && healthStatus.status === 'healthy' ? '✓ Ready' : '✗ Not Ready';
      }
    } catch (error) {
      console.error('Error getting health check status:', error);
    }

    // Check Echo Vault health
    let statusPort2594 = '✗ Not Ready';
    try {
      const response = await fetch(`${TRANSCRIPTION_SERVICE_BASE}health`);
      if (response.ok) {
        const healthStatus = await response.json();
        console.log('Echo Vault health check:', healthStatus);
        statusPort2594 = typeof healthStatus === 'object'
          && healthStatus !== null
          && 'status' in healthStatus
          && healthStatus.status === 'healthy' ? '✓ Ready' : '✗ Not Ready';
      }
    } catch (error) {
      console.error('Error getting health check status:', error);
    }

    // Check Echo Aligner health
    let statusPort2595 = '✗ Not Ready';
    try {
      const response = await fetch(`${ALIGNER_SERVICE_URL}/health`);
      if (response.ok) {
        const healthStatus = await response.json();
        console.log('Echo Aligner health check:', healthStatus);
        statusPort2595 = typeof healthStatus === 'object'
          && healthStatus !== null
          && 'status' in healthStatus
          && healthStatus.status === 'healthy' ? '✓ Ready' : '✗ Not Ready';
      }
    } catch (error) {
      console.error('Error getting health check status:', error);
    }

    // Start the HTTP API server
    const server = app.listen(PORT, () => {
      console.table([
        { Endpoint: 'Health check', URL: `http://localhost:${PORT}/health`, Status: '✓ Ready' },
        { Endpoint: 'Database', URL: 'MongoDB', Status: '✓ Connected' },
        { Endpoint: 'Live Recorder WebSocket', URL: `ws://localhost:${PORT}/ws/live-recorder` },
        { Endpoint: 'Echo Stream', URL: LIVE_SERVICE_BASE, Status: statusPort2592 },
        { Endpoint: 'Echo Voices', URL: SEGMENTATION_SERVICE_URL, Status: statusPort2593 },
        { Endpoint: 'Echo Vault', URL: TRANSCRIPTION_SERVICE_BASE, Status: statusPort2594 },
        { Endpoint: 'Echo Aligner', URL: ALIGNER_SERVICE_URL, Status: statusPort2595 },
      ]);
    });

    // Initialize WebSocket service for live recording
    const liveRecorderService = new LiveRecorderService(server);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  try {
    const { disconnectFromDatabase } = await import('./config/database');
    await disconnectFromDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  try {
    const { disconnectFromDatabase } = await import('./config/database');
    await disconnectFromDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();

export default app;
