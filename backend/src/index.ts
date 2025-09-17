import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectToDatabase } from './config/database';
import { DataSeeder } from './utils/seedData';
import meetingsRouter from './routes/meetings';
import hotwordsRouter from './routes/hotwords';
import segmentationRouter from './routes/segmentation';
import recordingsRouter from './routes/recordings';

const app = express();
const PORT = process.env.PORT || 2591;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for recordings
const recordingsDir = path.join(__dirname, '..', '..', 'recordings');
app.use('/recordings', express.static(recordingsDir));

// Routes
app.use('/api/meetings', meetingsRouter);
app.use('/api/hotwords', hotwordsRouter);
app.use('/api/segmentation', segmentationRouter);
app.use('/api/recordings', recordingsRouter);

// Save recording endpoint
app.post('/api/save-recording', (req, res) => {
  try {
    const { meetingId, transcription, duration, filename } = req.body;
    
    if (!meetingId || !transcription) {
      return res.status(400).json({ error: 'Meeting ID and transcription are required' });
    }
    
    // 为演示目的生成一个假的下载链接
    const downloadUrl = `/recordings/${filename}`;
    
    res.json({
      success: true,
      filename: filename,
      downloadUrl: downloadUrl,
      message: 'Recording saved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
    message: 'Summit AI Backend API',
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
      recordingsStatic: '/recordings/*'
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
  res.status(404).json({ error: 'Route not found' });
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
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Summit API server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📝 Meetings API: http://localhost:${PORT}/api/meetings`);
      console.log(`🗄️  Database: MongoDB connected`);
    });
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