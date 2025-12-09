# Authentication Method Locking Mechanism

A pattern for implementing role-based authentication method locking in web applications. This allows administrators to control access to local authentication (login/registration) while maintaining emergency admin access.

## Overview

This mechanism provides:
- **Global locking**: Disable local authentication for all users
- **Role-based overrides**: Allow specific roles (e.g., admin) to bypass locks
- **Admin initialization mode**: Enable initial admin setup while keeping regular users locked out
- **Localized messaging**: Display lock status messages in multiple languages
- **External auth redirect**: Guide users to alternative authentication methods

## Configuration Schema

```typescript
interface AuthMethodLockConfig {
  locked: boolean;                    // Default lock state for all users
  message?: {                         // Message shown when locked
    en?: string;
    'zh-CN'?: string;
    // Add other locales as needed
  };
  admin?: {                           // Override settings for admin role
    locked?: boolean;                 // If undefined, inherits from parent locked
    message?: {
      en?: string;
      'zh-CN'?: string;
    };
  };
  redirectUrl?: string;               // URL to redirect for alternative auth
}
```

### Example Configuration

```json
{
  "localLoginForm": {
    "locked": true,
    "message": {
      "en": "Local login is currently unavailable",
      "zh-CN": "本地登录功能已被禁用。"
    },
    "admin": {
      "locked": false,
      "message": {
        "en": "Admin-only access. Local login is disabled for regular users.",
        "zh-CN": "管理员专用入口，本地登录功能已被禁用。"
      }
    },
    "redirectUrl": "https://sso.example.com/oauth"
  }
}
```

## Lock State Matrix

| `locked` | `admin.locked` | Regular Users | Admin Users | Registration | Login UI |
|----------|----------------|---------------|-------------|--------------|----------|
| `false`  | (any)          | ✅ Allowed    | ✅ Allowed  | ✅ Allowed   | Form visible |
| `true`   | `true`         | ❌ Locked     | ❌ Locked   | ❌ Locked    | Message only |
| `true`   | `false`        | ❌ Locked     | ✅ Allowed  | ✅ Admin init mode | Collapsible admin form |
| `true`   | (undefined)    | ❌ Locked     | ❌ Locked   | ❌ Locked    | Message only |

**Admin initialization mode**: When `locked=true` and `admin.locked=false`:
- Registration page shows a warning but allows form submission for initial admin setup
- Login page shows the lock message with redirect link, plus a collapsible "管理员登录" toggle that reveals the login form when expanded
- The backend should enforce that only admin accounts can be created in this mode

## Implementation

### Backend

#### 1. Configuration Reader

```typescript
interface AuthMethodLockConfig {
  locked: boolean;
  message?: { en?: string; 'zh-CN'?: string };
  admin?: {
    locked?: boolean;
    message?: { en?: string; 'zh-CN'?: string };
  };
  redirectUrl?: string;
}

async function getAuthLockConfig(): Promise<AuthMethodLockConfig | null> {
  // Read from config file, database, or environment
  const config = await readConfig();
  return config.localLoginForm ?? null;
}
```

#### 2. Lock Check Functions

```typescript
// Check if login is locked for a specific role
async function isLoginLocked(isAdmin: boolean): Promise<boolean> {
  const config = await getAuthLockConfig();
  if (!config) return false;

  if (isAdmin && config.admin !== undefined) {
    return config.admin.locked ?? config.locked ?? false;
  }
  return config.locked ?? false;
}

// Check if registration is locked (with admin init mode support)
async function isRegistrationLocked(): Promise<boolean> {
  const config = await getAuthLockConfig();
  if (!config) return false;

  const defaultLocked = config.locked ?? false;
  const adminLocked = config.admin?.locked ?? defaultLocked;

  // Admin init mode: allow registration when default locked but admin not locked
  if (defaultLocked && !adminLocked) {
    return false;
  }

  return defaultLocked;
}
```

#### 3. Route Protection

```typescript
// Login endpoint
router.post('/login', async (req, res) => {
  const isAdmin = req.query.role === 'admin';
  const locked = await isLoginLocked(isAdmin);
  
  if (locked) {
    throw new Error('Login is currently disabled');
  }
  
  // ... proceed with authentication
});

// Registration endpoint
router.post('/register', async (req, res) => {
  const locked = await isRegistrationLocked();
  
  if (locked) {
    throw new Error('Registration is currently disabled');
  }
  
  // ... proceed with registration
});
```

### Frontend

#### 1. Type Definitions

```typescript
interface AuthMethodLockConfig {
  locked?: boolean;
  message?: {
    en?: string;
    'zh-CN'?: string;
  };
  admin?: {
    locked?: boolean;
    message?: {
      en?: string;
      'zh-CN'?: string;
    };
  };
  redirectUrl?: string;
}
```

#### 2. Lock State Computation

```typescript
// In Login component
const [adminFormExpanded, setAdminFormExpanded] = useState(false);

const { loginFormLocked, adminLoginFormLocked, loginMessage } = useMemo(() => {
  const config = appConfig.localLoginForm;
  if (!config) return { loginFormLocked: false, adminLoginFormLocked: false, loginMessage: undefined };

  // Check URL for role indicator (e.g., ?role=admin)
  const isAdminRole = searchParams.get('role') === 'admin';

  if (isAdminRole && config.admin !== undefined) {
    // For admin users, use admin settings if specified
    return {
      loginFormLocked: config.admin.locked ?? config.locked ?? false,
      adminLoginFormLocked: config.admin.locked ?? false,
      loginMessage: config.admin.message ?? config.message,
    };
  }
  
  // For non-admin users, use default settings
  return {
    loginFormLocked: config.locked ?? false,
    adminLoginFormLocked: config.admin?.locked ?? false,
    loginMessage: config.message,
  };
}, [appConfig.localLoginForm, searchParams]);
```

```typescript
// In Register component
const { registrationLocked, registrationMessage, isAdminInitMode } = useMemo(() => {
  const config = appConfig.localLoginForm;
  if (!config) return { registrationLocked: false, registrationMessage: undefined, isAdminInitMode: false };

  const defaultLocked = config.locked ?? false;
  const adminLocked = config.admin?.locked ?? defaultLocked;

  // Admin init mode: show form with warning
  if (defaultLocked && !adminLocked) {
    return {
      registrationLocked: false,
      isAdminInitMode: true,
      registrationMessage: 'This page is for admin initialization only.',
    };
  }

  // Fully locked
  if (defaultLocked) {
    return {
      registrationLocked: true,
      isAdminInitMode: false,
      registrationMessage: config.message?.en ?? 'Registration is disabled.',
    };
  }

  return { registrationLocked: false, registrationMessage: undefined, isAdminInitMode: false };
}, [appConfig.localLoginForm]);
```

#### 3. UI Rendering

```tsx
// Login form - Lock message with redirect
{loginFormLocked && displayMessage && (
  <Alert>
    <AlertDescription>
      {displayMessage}
      {redirectUrl && (
        <a href={redirectUrl}>Click here to authenticate</a>
      )}
    </AlertDescription>
  </Alert>
)}

// Admin-only message (when accessing with ?role=admin and admin is locked)
{adminLoginFormLocked && displayMessage && (
  <Alert>
    <AlertDescription>{displayMessage}</AlertDescription>
  </Alert>
)}

// Collapsible admin login toggle (when regular login locked but admin allowed)
{loginFormLocked && !adminLoginFormLocked && (
  <div className="border-t pt-4">
    <button
      type="button"
      onClick={() => setAdminFormExpanded(!adminFormExpanded)}
      className="flex items-center justify-between w-full text-sm"
    >
      <span className="text-xs">管理员登录</span>
      <ChevronDownIcon className={`h-4 w-4 transition-transform ${adminFormExpanded ? 'rotate-180' : ''}`} />
    </button>
  </div>
)}

// Show form when: not locked, OR (locked but admin allowed AND expanded)
{(!loginFormLocked || (loginFormLocked && !adminLoginFormLocked && adminFormExpanded)) && (
  <form onSubmit={handleLogin}>
    {/* Form fields */}
  </form>
)}
```

#### 4. Role Preservation on Logout

When admin users log out, preserve their role context by redirecting to the login page with the role query parameter:

```typescript
const handleLogout = () => {
  const isAdmin = user?.role === 'admin';
  logout();
  navigate(isAdmin ? '/login?role=admin' : '/login', { replace: true });
};
```

#### 5. API Calls with Role Context

```typescript
async function login(email: string, password: string, role?: 'admin' | 'user') {
  const url = role === 'admin' ? '/api/auth/login?role=admin' : '/api/auth/login';
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
```

## Security Considerations

1. **Backend enforcement**: Always validate lock state on the backend. Frontend checks are for UX only.

2. **Admin init mode**: In production, consider additional safeguards:
   - Check if any admin already exists before allowing registration
   - Require a setup token for initial admin creation
   - Log all registration attempts in admin init mode

3. **Role spoofing**: The `?role=admin` query parameter only affects which lock settings to check. Actual authentication still validates credentials.

4. **Config security**: Store lock configuration securely. Consider:
   - Environment variables for sensitive settings
   - Database-backed config for dynamic updates
   - Config file with restricted permissions

## Testing Checklist

- [ ] Default unlocked: All users can login/register
- [ ] Default locked: No users can login/register, only message shown
- [ ] Admin override: Only admin role can login when default locked
- [ ] Admin init mode: Registration shows warning but allows submission
- [ ] Admin init mode: Login shows collapsible "管理员登录" toggle, form hidden by default
- [ ] Admin init mode: Clicking toggle reveals/hides login form with chevron animation
- [ ] Messages display correctly in all supported languages
- [ ] Redirect URL works when configured
- [ ] Logout preserves admin role context
- [ ] Backend rejects requests when locked (not just frontend)
