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
import { isStrongPassword } from '../utils/password';

const router = Router();

function candidatePaths(): string[] {
  const fromCwd = path.resolve(process.cwd(), 'customization.json');
  const fromDist = path.resolve(__dirname, '..', '..', 'customization.json');
  const fromSrc = path.resolve(__dirname, '..', 'customization.json');
  return [fromCwd, fromDist, fromSrc];
}

interface LocalLoginFormConfig {
  locked: boolean;
  message?: { en?: string; 'zh-CN'?: string };
  admin?: {
    locked?: boolean;
    message?: { en?: string; 'zh-CN'?: string };
  };
  redirectUrl?: string;
}

interface CustomizationConfig {
  requireStrongPassword?: boolean;
  localLoginForm?: LocalLoginFormConfig;
}

async function loadCustomizationConfig(): Promise<CustomizationConfig | null> {
  const paths = candidatePaths();
  for (const filePath of paths) {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(data) as CustomizationConfig;
      return json;
    } catch (_) {
      // try next candidate
    }
  }
  return null;
}

async function getLocalLoginFormConfig(): Promise<LocalLoginFormConfig | null> {
  const config = await loadCustomizationConfig();
  return config?.localLoginForm ?? null;
}

async function isStrongPasswordRequired(): Promise<boolean> {
  const config = await loadCustomizationConfig();
  return Boolean(config?.requireStrongPassword);
}

async function isLocalLoginFormLocked(isAdmin: boolean): Promise<boolean> {
  const config = await getLocalLoginFormConfig();
  if (!config) return false;

  if (isAdmin && config.admin !== undefined) {
    // For admin users, use admin.locked if specified, otherwise fall back to default locked
    return config.admin.locked ?? config.locked ?? false;
  }
  // For non-admin users, use default locked
  return config.locked ?? false;
}

async function isRegistrationLocked(): Promise<boolean> {
  const config = await getLocalLoginFormConfig();
  if (!config) return false;

  const defaultLocked = config.locked ?? false;
  const adminLocked = config.admin?.locked ?? defaultLocked;

  // If default is locked but admin is not locked, allow registration (admin init mode)
  if (defaultLocked && !adminLocked) {
    return false;
  }

  return defaultLocked;
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
  return (
    typeof candidate.valid === 'boolean' &&
    (candidate.error === undefined || typeof candidate.error === 'string') &&
    (candidate.token === undefined || typeof candidate.token === 'string')
  );
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

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    // Check if registration is locked
    // Registration is allowed if: (1) not locked, or (2) admin init mode (default locked but admin not locked)
    const registrationLocked = await isRegistrationLocked();
    if (registrationLocked) {
      throw badRequest('本地账户注册已被禁用', 'auth.registration_disabled');
    }

    const body = req.body as Partial<CreateUserDto>;
    if (!body?.email || !body?.password) {
      throw badRequest('邮箱和密码为必填项', 'auth.invalid_payload');
    }
    const strongPasswordRequired = await isStrongPasswordRequired();
    if (strongPasswordRequired && !isStrongPassword(body.password)) {
      throw badRequest('密码不符合安全要求：至少8位且包含字母、数字或特殊字符中的任意两种', 'auth.weak_password');
    }
    const user = await userService.createUser(body.email, body.password, body.name, typeof body.aliases === 'string' ? body.aliases : undefined);
    const token = signJwt({ userId: user._id.toString(), email: user.email, role: user.role });
    setAuditContext(res, {
      action: 'auth_register',
      resource: 'user',
      resourceId: user._id.toString(),
      status: 'success',
      force: true,
    });
    res.status(201).json({ token, user: toAuthUser(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    // Check if local login form is locked based on role query param
    const isAdmin = req.query.role === 'admin';
    const loginFormLocked = await isLocalLoginFormLocked(isAdmin);
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
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const r = req as RequestWithUser;
    if (!r.user) {
      throw unauthorized('未授权', 'auth.unauthorized');
    }
    const user = await userService.getById(r.user.userId);
    if (!user) {
      throw unauthorized('未授权', 'auth.unauthorized');
    }
    res.json({ user: toAuthUser(user) });
  })
);

// Change password for current user
router.put(
  '/password',
  authenticate,
  asyncHandler(async (req, res) => {
    const r = req as RequestWithUser;
    if (!r.user) {
      throw unauthorized('未授权', 'auth.unauthorized');
    }
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!currentPassword || !newPassword) {
      throw badRequest('当前密码和新密码为必填项', 'auth.invalid_payload');
    }
    const strongPasswordRequired = await isStrongPasswordRequired();
    if (strongPasswordRequired && !isStrongPassword(newPassword)) {
      throw badRequest('新密码不符合安全要求：至少8位且包含字母、数字或特殊字符中的任意两种', 'auth.weak_password');
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
  })
);

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
