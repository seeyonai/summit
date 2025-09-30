import { Router, Request, Response } from 'express';
import { alignerService } from '../../services/AlignerService';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

router.get('/model-info', asyncHandler(async (req: Request, res: Response) => {
  const info = await alignerService.getModelInfo();
  res.json(info);
}));

export default router;
