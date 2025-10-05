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

// Custom sign-on endpoint for external authentication service
router.post('/custom-sign-on', asyncHandler(async (req, res) => {
  const unsafeAuthServiceBaseURL = process.env.UNSAFE_AUTH_SERVICE_BASE_URL || 'http://localhost:4423';
  if (!unsafeAuthServiceBaseURL) {
    console.error('Unsafe auth service base URL is not defined');
    throw badRequest('Unsafe auth service base URL is not defined', 'auth.service_not_configured');
  }

  const payload = req.body;
  const authMethod = process.env.AUTH_METHOD || 'V5_MD5';
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    console.log('Custom sign-on request:', { authMethod, payload });
  }

  // Call the external auth service
  const loginResponse = await fetch(`${unsafeAuthServiceBaseURL}/auth/custom-sign-on`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: authMethod,
      payload,
    }),
  });

  const loginResult = await loginResponse.json();

  if (isDev) {
    console.log('Login service response:', loginResult);
  }

  if (!loginResult.valid) {
    throw unauthorized(loginResult.error || 'Authentication failed', 'auth.external_failed');
  }

  // Handle successful login
  const tokenEncoded = loginResult.token;
  if (!tokenEncoded || tokenEncoded.split('.').length !== 3) {
    console.error('Invalid token:', tokenEncoded);
    throw badRequest('Invalid token', 'auth.invalid_token');
  }

  const payloadPartEncoded = tokenEncoded.split('.')[1];
  const payloadPartDecoded = Buffer.from(payloadPartEncoded, 'base64').toString('utf-8');

  if (isDev) {
    console.log('payloadPartDecoded:', payloadPartDecoded);
  }

  // Extract user information from payload
  const parsedPayload = JSON.parse(payloadPartDecoded);
  if (isDev) {
    console.log('parsedPayload:', parsedPayload);
  }

  const { email, name, id } = parsedPayload.user;

  // Validate the payload
  if (!email || typeof email !== 'string' || !name || typeof name !== 'string' || !id || typeof id !== 'string') {
    throw badRequest(`Invalid payload. Missing required fields: ${!email ? 'email' : ''}${!name ? ' name' : ''}${!id ? ' id' : ''}`, 'auth.invalid_payload');
  }

  // Find user by external user ID or email, or create if not exists
  let user = await userService.findByExternalUserId(id) || await userService.findByEmail(email);

  if (isDev) {
    console.log('User lookup result:', { found: !!user, email, externalUserId: id });
  }

  if (!user) {
    // Create new user with external auth
    user = await userService.createExternalUser(email, name, id);

    if (isDev) console.log('Created new user:', { id: user._id, email });
  }

  // Generate token for the user
  const token = signJwt({ userId: user._id.toString(), email: user.email, role: user.role });

  if (isDev) console.log('[custom-sign-on] token:', token);

  res.status(200).json({ token, user: toAuthUser(user), message: 'Authentication successful' });
}));

export default router;
