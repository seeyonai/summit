import { Router, Request, Response } from 'express';
import { alignerService } from '../../services/AlignerService';

const router = Router();

router.get('/model-info', async (req: Request, res: Response) => {
  try {
    const info = await alignerService.getModelInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get aligner model info' });
  }
});

export default router;

