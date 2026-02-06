import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { checkAllServices, generateHealthTable } from '../utils/healthChecker';

const router = Router();
const PORT = Number(process.env.PORT) || 2591;

router.get('/', asyncHandler(async (req, res) => {
  const healthResult = await checkAllServices();
  const tableData = generateHealthTable(healthResult, PORT);
  res.json({
    services: tableData,
    allHealthy: healthResult.allHealthy,
  });
}));

export default router;
