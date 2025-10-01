import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import userService from '../services/UserService';
import { badRequest, unauthorized } from '../utils/errors';
import type { CreateUserDto, LoginDto } from '../types/users';
import type { AuthResponseUser, RequestWithUser } from '../types/auth';
import { signJwt } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { getPreferredLang } from '../utils/lang';

const router = Router();

function toAuthUser(u: { _id: any; email: string; name?: string; role: 'admin' | 'user' }): AuthResponseUser {
  return { _id: u._id.toString(), email: u.email, name: u.name, role: u.role };
}

router.post('/register', asyncHandler(async (req, res) => {
  const body = req.body as Partial<CreateUserDto>;
  if (!body?.email || !body?.password) {
    throw badRequest('Email and password are required', 'auth.invalid_payload');
  }
  const user = await userService.createUser(body.email, body.password, body.name);
  const token = signJwt({ userId: user._id.toString(), email: user.email, role: user.role });
  res.status(201).json({ token, user: toAuthUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const body = req.body as Partial<LoginDto>;
  if (!body?.email || !body?.password) {
    throw badRequest('Email and password are required', 'auth.invalid_payload');
  }
  const user = await userService.findByEmail(body.email);
  if (!user || !userService.verifyPassword(user, body.password)) {
    throw unauthorized('Invalid credentials', 'auth.invalid_credentials');
  }
  const token = signJwt({ userId: user._id.toString(), email: user.email, role: user.role });
  res.json({ token, user: toAuthUser(user) });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const r = req as RequestWithUser;
  if (!r.user) {
    throw unauthorized('Unauthorized', 'auth.unauthorized');
  }
  const user = await userService.getById(r.user.userId);
  if (!user) {
    throw unauthorized('Unauthorized', 'auth.unauthorized');
  }
  res.json({ user: toAuthUser(user) });
}));

// Update current user's profile (e.g., name)
router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const r = req as RequestWithUser;
  if (!r.user) {
    throw unauthorized('Unauthorized', 'auth.unauthorized');
  }
  const name = typeof req.body?.name === 'string' ? req.body.name : undefined;
  const updated = await userService.updateProfile(r.user.userId, { name });
  res.json({ user: toAuthUser(updated) });
}));

// Change password for current user
router.put('/password', authenticate, asyncHandler(async (req, res) => {
  const r = req as RequestWithUser;
  if (!r.user) {
    throw unauthorized('Unauthorized', 'auth.unauthorized');
  }
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!currentPassword || !newPassword) {
    throw badRequest('Current and new passwords are required', 'auth.invalid_payload');
  }
  await userService.updatePassword(r.user.userId, currentPassword, newPassword);
  const lang = getPreferredLang(req);
  res.json({ message: lang === 'en' ? 'Password updated' : '密码已更新' });
}));

export default router;
