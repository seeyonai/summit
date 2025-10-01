import express from 'express';
import { HotwordService } from '../../services/HotwordService';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest, unauthorized } from '../../utils/errors';
import type { RequestWithUser } from '../../types/auth';
import { authenticate } from '../../middleware/auth';
import { getPreferredLang } from '../../utils/lang';

const router = express.Router();
const hotwordService = new HotwordService();

// Helper to transform to API response
function toResponse(h: any) {
  return {
    _id: h._id.toString(),
    word: h.word,
    createdAt: (h.createdAt instanceof Date ? h.createdAt.toISOString() : h.createdAt),
    updatedAt: h.updatedAt ? (h.updatedAt instanceof Date ? h.updatedAt.toISOString() : h.updatedAt) : undefined,
    isActive: !!h.isActive,
    isPublic: !!h.isPublic,
    ownerId: h.ownerId ? h.ownerId.toString() : undefined,
  };
}

// Require authentication for all hotword routes
router.use(authenticate);

// Get all hotwords (public active + own)
router.get('/', asyncHandler(async (req: RequestWithUser, res) => {
  if (!req.user) throw unauthorized('Unauthorized', 'auth.unauthorized');
  const hotwords = await hotwordService.getHotwordsForUser(req.user);
  res.json(hotwords.map(toResponse));
}));

// Get multiple hotwords by IDs (comma-separated) - place before /:id
router.get('/batch', asyncHandler(async (req: RequestWithUser, res) => {
  const { ids } = req.query;

  if (!ids || typeof ids !== 'string') {
    throw badRequest('IDs parameter is required', 'hotword.ids_required');
  }

  const idList = ids.split(',').map((id) => id.trim()).filter((id) => id);
  if (!req.user) throw unauthorized('Unauthorized', 'auth.unauthorized');
  const hotwords = await hotwordService.getHotwordsByIdsForUser(idList, req.user);
  res.json(hotwords.map(toResponse));
}));

// Bulk import hotwords
router.post('/bulk', asyncHandler(async (req: RequestWithUser, res) => {
  const { words, isPublic } = req.body as { words?: unknown; isPublic?: unknown };

  if (!Array.isArray(words)) {
    throw badRequest('Words must be an array of strings', 'hotword.words_required');
  }

  if (!req.user) throw unauthorized('Unauthorized', 'auth.unauthorized');

  const list = words.map((w) => (typeof w === 'string' ? w : String(w)));
  const makePublic = typeof isPublic === 'boolean' ? isPublic : undefined;
  const result = await hotwordService.createHotwordsBulk(list, req.user, makePublic);

  res.status(201).json({
    created: result.created.map(toResponse),
    skipped: result.skipped,
  });
}));

// Create a new hotword
router.post('/', asyncHandler(async (req: RequestWithUser, res) => {
  const { word, isPublic } = req.body as { word?: unknown; isPublic?: unknown };

  if (!word || typeof word !== 'string') {
    throw badRequest('Word is required and must be a string', 'hotword.word_required');
  }

  if (!req.user) throw unauthorized('Unauthorized', 'auth.unauthorized');

  const makePublic = typeof isPublic === 'boolean' ? isPublic : undefined;
  const hotword = await hotwordService.createHotword(word, req.user, makePublic);
  res.status(201).json(toResponse(hotword));
}));

// Update a hotword
router.put('/:id', asyncHandler(async (req: RequestWithUser, res) => {
  const { id } = req.params;
  const { word, isActive, isPublic } = req.body as { word?: unknown; isActive?: unknown; isPublic?: unknown };

  if (!req.user) throw unauthorized('Unauthorized', 'auth.unauthorized');

  const update: { word?: string; isActive?: boolean; isPublic?: boolean } = {};
  if (typeof word === 'string' && word.trim().length > 0) {
    update.word = word;
  }
  if (typeof isActive === 'boolean') {
    update.isActive = isActive;
  }
  if (typeof isPublic === 'boolean') {
    update.isPublic = isPublic;
  }

  const hotword = await hotwordService.updateHotword(id, update, req.user);
  res.json(toResponse(hotword));
}));

// Delete a hotword
router.delete('/:id', asyncHandler(async (req: RequestWithUser, res) => {
  const { id } = req.params;
  if (!req.user) throw unauthorized('Unauthorized', 'auth.unauthorized');
  await hotwordService.deleteHotword(id, req.user);
  const lang = getPreferredLang(req);
  res.json({ message: lang === 'en' ? 'Hotword deleted successfully' : '热词删除成功' });
}));

export default router;
