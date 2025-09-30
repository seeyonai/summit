import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import userService from '../services/UserService';
import { requireAdmin } from '../middleware/auth';
import { badRequest, forbidden } from '../utils/errors';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const idsParam = typeof req.query.ids === 'string' ? req.query.ids : undefined;
  const limitParam = typeof req.query.limit === 'string' ? req.query.limit : undefined;
  const limit = limitParam ? Math.min(100, Math.max(1, Number(limitParam) || 20)) : 20;

  let users;
  if (idsParam) {
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    users = await userService.findByIds(ids);
  } else {
    users = await userService.searchUsers(q || '', limit);
  }

  res.json({ users: users.map((u) => ({
    _id: u._id.toString(),
    email: u.email,
    name: u.name,
    role: u.role,
  })) });
}));

// Admin: update role
router.put('/:userId/role', requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params as { userId: string };
  const role = (req.body?.role as string) as 'admin' | 'user';
  if (role !== 'admin' && role !== 'user') {
    throw badRequest('Invalid role', 'user.invalid_role');
  }
  // prevent self-demotion to avoid lockout
  if ((req as any).user?.userId === userId && role !== 'admin') {
    throw forbidden('Cannot change own role', 'user.cannot_change_self_role');
  }
  const updated = await userService.updateRole(userId, role);
  res.json({ user: { _id: updated._id.toString(), email: updated.email, name: updated.name, role: updated.role } });
}));

export default router;
