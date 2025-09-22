import { Router } from 'express';
import recordingsRouter from './recordings';
import uploadRouter from './upload';
import transcribeRouter from './transcribe';
import segmentRouter from './segment';
import polishRouter from './polish';
import alignRouter from './align';
import organizeRouter from './organize';

const router = Router();

// Mount all the sub-routes
router.use('/', recordingsRouter);
router.use('/upload', uploadRouter);
router.use('/:recordingId/transcribe', transcribeRouter);
router.use('/:recordingId/segment', segmentRouter);
router.use('/:recordingId/polish', polishRouter);
router.use('/:recordingId/align', alignRouter);
router.use('/:recordingId/organize', organizeRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Recording Management Service' });
});

export default router;
