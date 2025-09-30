import express from 'express';
import { HotwordService } from '../../services/HotwordService';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest } from '../../utils/errors';

const router = express.Router();
const hotwordService = new HotwordService();

// Get all hotwords
router.get('/', asyncHandler(async (req, res) => {
  const hotwords = await hotwordService.getAllHotwords();
  res.json(hotwords);
}));

// Create a new hotword
router.post('/', asyncHandler(async (req, res) => {
  const { word } = req.body as { word?: unknown };

  if (!word || typeof word !== 'string') {
    throw badRequest('Word is required and must be a string', 'hotword.word_required');
  }

  const hotword = await hotwordService.createHotword(word);
  res.status(201).json(hotword);
}));

// Update a hotword
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { word, isActive } = req.body as { word?: unknown; isActive?: unknown };

  const update: { word?: string; isActive?: boolean } = {};
  if (typeof word === 'string' && word.trim().length > 0) {
    update.word = word;
  }
  if (typeof isActive === 'boolean') {
    update.isActive = isActive;
  }

  const hotword = await hotwordService.updateHotword(id, update);
  res.json(hotword);
}));

// Delete a hotword
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await hotwordService.deleteHotword(id);
  res.json({ message: '热词删除成功' });
}));

// Get multiple hotwords by IDs (comma-separated)
router.get('/batch', asyncHandler(async (req, res) => {
  const { ids } = req.query;

  if (!ids || typeof ids !== 'string') {
    throw badRequest('IDs parameter is required', 'hotword.ids_required');
  }

  const idList = ids.split(',').map((id) => id.trim()).filter((id) => id);
  const hotwords = await hotwordService.getHotwordsByIds(idList);
  res.json(hotwords);
}));

export default router;
