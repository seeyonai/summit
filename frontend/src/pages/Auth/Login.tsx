import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '@/contexts/ConfigContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BackgroundPattern from '@/components/BackgroundPattern';
import { ArrowRightIcon, ChevronDownIcon } from 'lucide-react';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const { config } = useConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminFormExpanded, setAdminFormExpanded] = useState(false);

  const [searchParams] = useSearchParams();
  const isAdminRole = searchParams.get('role') === 'admin';

  // Determine lock status and message based on role
  const { loginFormLocked, adminLoginFormLocked, loginMessage } = useMemo(() => {
    const localLoginForm = config.localLoginForm;
    if (!localLoginForm) return { loginFormLocked: false, adminLoginFormLocked: false, loginMessage: undefined };

    if (isAdminRole && localLoginForm.admin !== undefined) {
      // For admin users, use admin settings if specified
      return {
        loginFormLocked: localLoginForm.admin.locked ?? localLoginForm.locked ?? false,
        adminLoginFormLocked: localLoginForm.admin.locked ?? false,
        loginMessage: localLoginForm.admin.message ?? localLoginForm.message,
      };
    }
    // For non-admin users, use default settings
    return {
      loginFormLocked: localLoginForm.locked ?? false,
      adminLoginFormLocked: localLoginForm.admin?.locked ?? false,
      loginMessage: localLoginForm.message,
    };
  }, [config.localLoginForm, isAdminRole]);

  const redirectUrl = config.localLoginForm?.redirectUrl;

  // Detect browser language (simplified: just check if starts with 'zh')
  const browserLang = navigator.language.toLowerCase();
  const isZhCN = browserLang.startsWith('zh');
  const displayMessage = loginMessage ? (isZhCN ? loginMessage['zh-CN'] : loginMessage.en) || loginMessage.en || loginMessage['zh-CN'] : undefined;

  // Get the intended destination from location state or default to meetings
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password, isAdminRole ? 'admin' : undefined);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fafafa] relative text-gray-900">
      <BackgroundPattern />
      <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6 sm:mb-8">
            <img src="/logo-square.png" alt="Summit AI" className="h-12 w-auto sm:h-16" />
          </div>

          <Card>
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl">登录</CardTitle>
              <CardDescription className="text-sm sm:text-base">欢迎回到 Summit AI</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              {loginFormLocked && displayMessage && (
                <Alert className="mb-4">
                  <AlertDescription>
                    {displayMessage}
                    {redirectUrl && (
                      <div className="flex items-center">
                        {' '}
                        <a href={redirectUrl} className="font-bold text-primary hover:underline font-medium">
                          {isZhCN ? '点击这里进行身份认证' : 'Click here to authenticate'}
                        </a>
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {adminLoginFormLocked && displayMessage && (
                <Alert className="mb-4">
                  <AlertDescription>{displayMessage}</AlertDescription>
                </Alert>
              )}

              {loginFormLocked && !adminLoginFormLocked && (
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setAdminFormExpanded(!adminFormExpanded)}
                    className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="text-xs">管理员登录</span>
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${adminFormExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}

              {(!loginFormLocked || (loginFormLocked && !adminLoginFormLocked && adminFormExpanded)) && (
                <>
                  <form onSubmit={onSubmit} className={`space-y-4 ${loginFormLocked && !adminLoginFormLocked ? 'mt-4' : ''}`}>
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">密码</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? '登录中...' : '登录'}
                    </Button>
                  </form>
                  <div className="mt-6 text-center text-sm">
                    还没有账号？{' '}
                    <Link to="/register" className="text-primary hover:underline">
                      注册
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Login;
