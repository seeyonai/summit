import express from 'express';
import multer from 'multer';
import { HotwordService } from '../../services/HotwordService';
import { asyncHandler } from '../../middleware/errorHandler';
import { badRequest, unauthorized } from '../../utils/errors';
import type { RequestWithUser } from '../../types/auth';
import { authenticate } from '../../middleware/auth';
import { getPreferredLang } from '../../utils/lang';
import { setAuditContext } from '../../middleware/audit';
import { parseHotwordsFromBuffer } from '../../utils/hotwordImport';

const router = express.Router();
const hotwordService = new HotwordService();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 512 * 1024 } });

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
  }
  return undefined;
}

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

router.get('/export', asyncHandler(async (req: RequestWithUser, res) => {
  if (!req.user) throw unauthorized('Unauthorized', 'auth.unauthorized');
  const hotwords = await hotwordService.getHotwordsForUser(req.user);
  const headers = ['word', 'isActive', 'isPublic', 'createdAt', 'updatedAt'];
  const rows = hotwords.map((h) => [
    h.word,
    h.isActive ? 'true' : 'false',
    h.isPublic ? 'true' : 'false',
    h.createdAt ? new Date(h.createdAt).toISOString() : '',
    h.updatedAt ? new Date(h.updatedAt).toISOString() : '',
  ]);
  const csvLines = [headers.join(','), ...rows.map((row) => row.map((value) => {
    const cell = value ?? '';
    return typeof cell === 'string' && cell.includes(',') ? `"${cell.replace(/"/g, '""')}"` : cell;
  }).join(','))];
  const csvContent = `\uFEFF${csvLines.join('\n')}`;
  const filename = `hotwords-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  setAuditContext(res, {
    action: 'hotword_export',
    resource: 'hotword',
    status: 'success',
    details: { count: hotwords.length },
  });
  res.send(csvContent);
}));

router.post('/import', upload.single('file'), asyncHandler(async (req: RequestWithUser, res) => {
  if (!req.user) throw unauthorized('Unauthorized', 'auth.unauthorized');
  if (!req.file || !req.file.buffer) {
    throw badRequest('Import file is required', 'hotword.import_file_required');
  }

  const parsed = parseHotwordsFromBuffer(req.file.buffer);

  if (parsed.valid.length === 0) {
    throw badRequest('No valid hotwords found in file', 'hotword.import_no_valid');
  }

  const isPublic = parseBoolean((req.body ?? {}).isPublic);
  const result = await hotwordService.createHotwordsBulk(parsed.valid, req.user, isPublic);

  setAuditContext(res, {
    action: 'hotword_import',
    resource: 'hotword',
    status: 'success',
    details: {
      createdCount: result.created.length,
      skippedCount: result.skipped.length,
      invalidCount: parsed.invalid.length,
      duplicateCount: parsed.duplicates.length,
    },
  });

  res.status(201).json({
    created: result.created.map(toResponse),
    skipped: result.skipped,
    invalid: parsed.invalid,
    duplicates: parsed.duplicates,
    summary: {
      total: parsed.totalEntries,
      valid: parsed.valid.length,
      invalid: parsed.invalid.length,
      duplicates: parsed.duplicates.length,
      created: result.created.length,
      skipped: result.skipped.length,
    },
  });
}));

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

  setAuditContext(res, {
    action: 'hotword_bulk_create',
    resource: 'hotword',
    status: 'success',
    details: {
      createdCount: result.created.length,
      skippedCount: result.skipped.length,
      isPublic: makePublic,
    },
  });
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
  setAuditContext(res, {
    action: 'hotword_create',
    resource: 'hotword',
    resourceId: hotword._id.toString(),
    status: 'success',
    details: { isPublic: hotword.isPublic },
  });
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
  setAuditContext(res, {
    action: 'hotword_update',
    resource: 'hotword',
    resourceId: hotword._id.toString(),
    status: 'success',
    details: {
      changedFields: Object.keys(update),
    },
  });
  res.json(toResponse(hotword));
}));

// Delete a hotword
router.delete('/:id', asyncHandler(async (req: RequestWithUser, res) => {
  const { id } = req.params;
  if (!req.user) throw unauthorized('Unauthorized', 'auth.unauthorized');
  await hotwordService.deleteHotword(id, req.user);
  const lang = getPreferredLang(req);
  setAuditContext(res, {
    action: 'hotword_delete',
    resource: 'hotword',
    resourceId: id,
    status: 'success',
  });
  res.json({ message: lang === 'en' ? 'Hotword deleted successfully' : '热词删除成功' });
}));

export default router;
