// Load environment variables FIRST, before any other imports
import './config/env';

import express from 'express';
import cors from 'cors';
import { connectToDatabase } from './config/database';
import filesRouter from './routes/files';

import { DataSeeder } from './utils/seedData';
import meetingsRouter from './routes/meetings/index';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import hotwordsRouter from './routes/hotwords';
import notesRouter from './routes/notes';
import proofingRouter from './routes/proofing';
import segmentationRouter from './routes/segmentation';
import alignerRouter from './routes/aligner';
import recordingsRouter from './routes/recordings/index';
import configRouter from './routes/config';
import adminAuditRouter from './routes/adminAudit';
import adminHealthRouter from './routes/adminHealth';
import { LiveRecorderService } from './services/LiveRecorderService';
import { checkAllServices, generateHealthTable } from './utils/healthChecker';
import { errorHandler } from './middleware/errorHandler';
import { authenticate, requireAdmin } from './middleware/auth';
import { getPreferredLang } from './utils/lang';
import { debug, debugWarn } from './utils/logger';
import { ensureAuditLoggerReady, getAuditLogPath } from './utils/auditLogger';
import { auditMiddleware } from './middleware/audit';

const app = express();
const PORT = Number(process.env.PORT) || 2591;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(auditMiddleware());

// Protected file streaming for audio files (router handles token via header or query)
app.use('/files', filesRouter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/meetings', authenticate, meetingsRouter);
app.use('/api/hotwords', authenticate, hotwordsRouter);
app.use('/api/notes', authenticate, notesRouter);
app.use('/api/proofing', authenticate, proofingRouter);
app.use('/api/segmentation', segmentationRouter);
app.use('/api/aligner', alignerRouter);
app.use('/api/recordings', authenticate, recordingsRouter);
app.use('/api/config', configRouter);
app.use('/api/admin/audit', authenticate, requireAdmin, adminAuditRouter);
app.use('/api/admin/health', authenticate, requireAdmin, adminHealthRouter);

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
      database: 'connected',
    });
  } catch (error) {
    debugWarn('Health check failed:', error);
    res.json({
      status: 'unhealthy',
      service: 'Summit API',
      port: PORT,
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  const lang = getPreferredLang(req);
  res.json({
    message: lang === 'en' ? 'Summit API' : 'Summit 接口',
    version: '1.0.0',
    service: 'Summit API Server',
    port: PORT,
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler (use originalUrl for clarity)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found:' + req.originalUrl });
});

// Start server with database connection
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    debug('MongoDB connection established');

    await ensureAuditLoggerReady();
    debug('Audit logger ready', { path: getAuditLogPath() });

    // Seed data if environment variable is set
    if (process.env.SEED_DATA) {
      const seeder = new DataSeeder();
      await seeder.seedData();
      debug('Seed data completed');
    }

    // Check all external services health
    const healthResult = await checkAllServices();

    // Start the HTTP API server
    const server = app.listen(PORT, () => {
      generateHealthTable(healthResult, PORT);
      debug(`Summit API listening on port ${PORT}`);
    });

    // Initialize WebSocket services
    new LiveRecorderService(server);
    debug('LiveRecorderService initialized');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  debug('SIGINT handler triggered');
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
  debug('SIGTERM handler triggered');
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
