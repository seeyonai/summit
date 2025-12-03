import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import userService from '../services/UserService';
import { badRequest, unauthorized } from '../utils/errors';
import type { CreateUserDto, LoginDto } from '../types/users';
import type { AuthResponseUser, RequestWithUser } from '../types/auth';
import { signJwt } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { getPreferredLang } from '../utils/lang';
import { setAuditContext } from '../middleware/audit';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

function candidatePaths(): string[] {
  const fromCwd = path.resolve(process.cwd(), 'customization.json');
  const fromDist = path.resolve(__dirname, '..', '..', 'customization.json');
  const fromSrc = path.resolve(__dirname, '..', 'customization.json');
  return [fromCwd, fromDist, fromSrc];
}

async function isLocalAccountsEnabled(): Promise<boolean> {
  const paths = candidatePaths();
  for (const filePath of paths) {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(data);
      // Default to true if not specified
      return json.features?.enableLocalAccounts ?? true;
    } catch (_) {
      // try next candidate
    }
  }
  // If config file not found, default to true
  return true;
}

async function isLocalLoginFormLocked(): Promise<boolean> {
  const paths = candidatePaths();
  for (const filePath of paths) {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(data);
      // Default to false if not specified
      return json.localLoginForm?.locked ?? false;
    } catch (_) {
      // try next candidate
    }
  }
  // If config file not found, default to false (not locked)
  return false;
}

interface CustomSignOnResponse {
  valid: boolean;
  error?: string;
  token?: string;
}

const isCustomSignOnResponse = (value: unknown): value is CustomSignOnResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<CustomSignOnResponse>;
  return typeof candidate.valid === 'boolean'
    && (candidate.error === undefined || typeof candidate.error === 'string')
    && (candidate.token === undefined || typeof candidate.token === 'string');
};

interface AuthUserSource {
  _id: { toString(): string };
  email: string;
  name?: string;
  aliases?: string;
  role: 'admin' | 'user';
}

function toAuthUser(u: AuthUserSource): AuthResponseUser {
  return {
    _id: u._id.toString(),
    email: u.email,
    name: u.name,
    aliases: u.aliases,
    role: u.role,
  };
}

router.post('/register', asyncHandler(async (req, res) => {
  // Check if local account registration is enabled
  const localAccountsEnabled = await isLocalAccountsEnabled();
  if (!localAccountsEnabled) {
    throw badRequest('本地账户注册已被禁用', 'auth.registration_disabled');
  }

  const body = req.body as Partial<CreateUserDto>;
  if (!body?.email || !body?.password) {
    throw badRequest('邮箱和密码为必填项', 'auth.invalid_payload');
  }
  const user = await userService.createUser(
    body.email,
    body.password,
    body.name,
    typeof body.aliases === 'string' ? body.aliases : undefined
  );
  const token = signJwt({ userId: user._id.toString(), email: user.email, role: user.role });
  setAuditContext(res, {
    action: 'auth_register',
    resource: 'user',
    resourceId: user._id.toString(),
    status: 'success',
    force: true,
  });
  res.status(201).json({ token, user: toAuthUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  // Check if local login form is locked
  const loginFormLocked = await isLocalLoginFormLocked();
  if (loginFormLocked) {
    throw badRequest('本地登录功能已被锁定', 'auth.login_locked');
  }

  const body = req.body as Partial<LoginDto>;
  if (!body?.email || !body?.password) {
    throw badRequest('邮箱和密码为必填项', 'auth.invalid_payload');
  }
  const user = await userService.findByEmail(body.email);
  if (!user || !userService.verifyPassword(user, body.password)) {
    throw unauthorized('邮箱或密码错误', 'auth.invalid_credentials');
  }
  const token = signJwt({ userId: user._id.toString(), email: user.email, role: user.role });
  setAuditContext(res, {
    action: 'auth_login',
    resource: 'user',
    resourceId: user._id.toString(),
    status: 'success',
    force: true,
  });
  res.json({ token, user: toAuthUser(user) });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const r = req as RequestWithUser;
  if (!r.user) {
    throw unauthorized('未授权', 'auth.unauthorized');
  }
  const user = await userService.getById(r.user.userId);
  if (!user) {
    throw unauthorized('未授权', 'auth.unauthorized');
  }
  res.json({ user: toAuthUser(user) });
}));

// Change password for current user
router.put('/password', authenticate, asyncHandler(async (req, res) => {
  const r = req as RequestWithUser;
  if (!r.user) {
    throw unauthorized('未授权', 'auth.unauthorized');
  }
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!currentPassword || !newPassword) {
    throw badRequest('当前密码和新密码为必填项', 'auth.invalid_payload');
  }
  await userService.updatePassword(r.user.userId, currentPassword, newPassword);
  const lang = getPreferredLang(req);
  setAuditContext(res, {
    action: 'auth_change_password',
    resource: 'user',
    resourceId: r.user.userId,
    status: 'success',
    force: true,
  });
  res.json({ message: lang === 'en' ? 'Password updated' : '密码已更新' });
}));

// Generate random state for OAuth CSRF protection
function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// OAuth landing - initiates OAuth flow by redirecting to OAuth provider
router.get('/oauth/landing', asyncHandler(async (req, res) => {
  const unsafeAuthServiceBaseURL = process.env.UNSAFE_AUTH_SERVICE_BASE_URL;
  const redirectURL = process.env.OAUTH_REDIRECT_URL;
  const provider = req.query.provider as string;

  if (!unsafeAuthServiceBaseURL || !redirectURL || !provider) {
    throw badRequest('OAuth未配置', 'auth.oauth_not_configured');
  }

  // Generate and save state for CSRF protection
  const state = generateOAuthState();
  res.cookie('oauth_state_summit', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000, // 1 hour
    sameSite: 'lax',
  });

  // Redirect to OAuth provider
  const authUrl = `${unsafeAuthServiceBaseURL}/oauth/${provider}?state=${state}&callback=${encodeURIComponent(redirectURL)}`;
  res.redirect(authUrl);
}));

// OAuth callback - handles callback from OAuth provider
router.get('/oauth/callback', asyncHandler(async (req, res) => {
  const { code, state, provider } = req.query;
  const unsafeAuthServiceBaseURL = process.env.UNSAFE_AUTH_SERVICE_BASE_URL;
  const unsafeAuthServiceHTTPBaseURL = process.env.UNSAFE_AUTH_SERVICE_HTTP_BASE_URL || unsafeAuthServiceBaseURL;
  const frontendBaseURL = process.env.FRONTEND_BASE_URL || 'http://localhost:2590';

  if (!code || !state || !provider) {
    throw badRequest('缺少OAuth参数', 'auth.oauth_missing_params');
  }

  if (!unsafeAuthServiceBaseURL) {
    throw badRequest('OAuth未配置', 'auth.oauth_not_configured');
  }

  // Verify state cookie for CSRF protection
  const savedState = req.cookies?.oauth_state_summit;
  if (savedState && savedState !== state) {
    throw badRequest('无效的OAuth状态', 'auth.oauth_invalid_state');
  }

  // Fetch user resource from OAuth provider
  const resourceResponse = await fetch(`${unsafeAuthServiceHTTPBaseURL}/oauth/${provider}/resource?code=${code}`);

  if (!resourceResponse.ok) {
    throw badRequest('获取用户信息失败', 'auth.oauth_resource_failed');
  }

  const resource = await resourceResponse.json();

  if (!resource || !resource.name || !resource.email) {
    throw badRequest('无效的用户信息', 'auth.oauth_invalid_resource');
  }

  // Generate internal OAuth code for frontend exchange
  const oauthCode = generateOAuthState();

  // Find or create user
  let user = await userService.findByEmail(resource.email);

  if (user) {
    // Existing user - verify auth type
    if (user.authType && user.authType !== 'oauth') {
      // Redirect to frontend with error
      const errorUrl = new URL(`${frontendBaseURL}/oauth/callback`);
      errorUrl.searchParams.set('error', 'account_already_exists');
      errorUrl.searchParams.set('message', 'An account with this email already exists but uses a different login method');
      res.redirect(errorUrl.toString());
      return;
    }
    // Update with new OAuth code
    await userService.updateOAuthCode(user._id.toString(), oauthCode);
  } else {
    // Create new OAuth user
    user = await userService.createOAuthUser(resource.email, resource.name, provider as string, oauthCode);
  }

  // Clear the state cookie
  res.clearCookie('oauth_state_summit');

  // Redirect to frontend callback page with internal code
  const url = new URL(`${frontendBaseURL}/oauth/callback`);
  url.searchParams.set('code', oauthCode);
  setAuditContext(res, {
    action: 'auth_oauth_callback',
    resource: 'user',
    resourceId: user._id.toString(),
    status: 'success',
  });
  res.redirect(url.toString());
}));

// OAuth exchange - exchanges internal code for JWT token
router.get('/oauth/exchange', asyncHandler(async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    throw badRequest('无效的code参数', 'auth.oauth_invalid_code');
  }

  // Find user with the OAuth code
  const user = await userService.findByOAuthCode(code);

  if (!user) {
    throw unauthorized('无效的OAuth code', 'auth.oauth_code_invalid');
  }

  // Generate JWT token
  const token = signJwt({ userId: user._id.toString(), email: user.email, role: user.role });

  setAuditContext(res, {
    action: 'auth_oauth_exchange',
    resource: 'user',
    resourceId: user._id.toString(),
    status: 'success',
    force: true,
  });

  res.status(200).json({
    token,
    user: toAuthUser(user),
    message: 'OAuth登录成功',
  });

  // Clear the OAuth code (one-time use)
  await userService.clearOAuthCode(user._id.toString());
}));

// Custom sign-on endpoint for external authentication service
router.post('/custom-sign-on', asyncHandler(async (req, res) => {
  const unsafeAuthServiceBaseURL = process.env.UNSAFE_AUTH_SERVICE_BASE_URL || 'http://localhost:4423';
  if (!unsafeAuthServiceBaseURL) {
    console.error('Unsafe auth service base URL is not defined');
    throw badRequest('外部认证服务地址未配置', 'auth.service_not_configured');
  }

  const payload = req.body;
  const authMethod = process.env.AUTH_METHOD || 'V5_MD5';

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

  const loginResultJson = await loginResponse.json();

  if (!isCustomSignOnResponse(loginResultJson)) {
    console.error('Unexpected login response format:', loginResultJson);
    throw badRequest('无效的登录响应', 'auth.external_invalid_response');
  }

  const loginResult = loginResultJson;

  if (!loginResult.valid) {
    throw unauthorized(loginResult.error || '认证失败', 'auth.external_failed');
  }

  // Handle successful login
  const tokenEncoded = loginResult.token;
  if (!tokenEncoded || tokenEncoded.split('.').length !== 3) {
    console.error('Invalid token:', tokenEncoded);
    throw badRequest('无效的令牌', 'auth.invalid_token');
  }

  const payloadPartEncoded = tokenEncoded.split('.')[1];
  const payloadPartDecoded = Buffer.from(payloadPartEncoded, 'base64').toString('utf-8');

  // Extract user information from payload
  const parsedPayload = JSON.parse(payloadPartDecoded);

  const { email, name, id } = parsedPayload.user;

  // Validate the payload
  if (!email || typeof email !== 'string' || !name || typeof name !== 'string' || !id || typeof id !== 'string') {
    throw badRequest(`无效的数据。缺少必填字段：${!email ? '邮箱' : ''}${!name ? ' 姓名' : ''}${!id ? ' ID' : ''}`, 'auth.invalid_payload');
  }

  // Find user by external user ID or email, or create if not exists
  let user = await userService.findByExternalUserId(id) || await userService.findByEmail(email);

  if (!user) {
    // Create new user with external auth
    user = await userService.createExternalUser(email, name, id);
  }

  // Generate token for the user
  const token = signJwt({ userId: user._id.toString(), email: user.email, role: user.role });

  setAuditContext(res, {
    action: 'auth_custom_sign_on',
    resource: 'user',
    resourceId: user._id.toString(),
    status: 'success',
    force: true,
  });
  res.status(200).json({ token, user: toAuthUser(user), message: 'Authentication successful' });
}));

export default router;
