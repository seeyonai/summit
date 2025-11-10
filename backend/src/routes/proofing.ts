import { Router, Request, Response } from 'express';
import proofingService from '../services/ProofingService';
import { ProofingRequest } from '../types';

const router = Router();

// Correct text with AI proofing
router.post('/correct', async (req: Request, res: Response) => {
  try {
    const request: ProofingRequest = req.body;

    // Validate required fields
    if (!request.input || typeof request.input !== 'string') {
      return res.status(400).json({ error: 'Input text is required' });
    }

    // Validate history is an array
    if (!Array.isArray(request.history)) {
      return res.status(400).json({ error: 'History must be an array' });
    }

    // Limit history to last 50 messages to avoid token limit issues
    const limitedHistory = request.history.slice(-50);

    const result = await proofingService.correctText({
      ...request,
      history: limitedHistory,
    });

    res.json(result);
  } catch (error) {
    console.error('Error correcting text:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
