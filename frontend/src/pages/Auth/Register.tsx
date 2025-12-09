import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '@/contexts/ConfigContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BackgroundPattern from '@/components/BackgroundPattern';

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, user } = useAuth();
  const { config } = useConfig();
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detect browser language
  const browserLang = navigator.language.toLowerCase();
  const isZhCN = browserLang.startsWith('zh');

  // Determine registration availability based on localLoginForm config
  const { registrationLocked, registrationMessage, isAdminInitMode } = useMemo(() => {
    const localLoginForm = config.localLoginForm;
    if (!localLoginForm) return { registrationLocked: false, registrationMessage: undefined, isAdminInitMode: false };

    const defaultLocked = localLoginForm.locked ?? false;
    const adminLocked = localLoginForm.admin?.locked ?? defaultLocked;

    // If default is locked but admin is not locked, this is admin-only initialization mode
    // Show form but with a warning message
    if (defaultLocked && !adminLocked) {
      return {
        registrationLocked: false,
        isAdminInitMode: true,
        registrationMessage: isZhCN
          ? '此页面仅用于系统管理员初始化。如果系统中已存在管理员账户，注册将失败。'
          : 'This page is only for system admin initialization. Registration will not work if there is already an admin account.',
      };
    }

    // If both are locked, registration is fully locked
    if (defaultLocked) {
      const message = localLoginForm.message;
      return {
        registrationLocked: true,
        isAdminInitMode: false,
        registrationMessage: message
          ? (isZhCN ? message['zh-CN'] : message.en) || message.en || message['zh-CN']
          : isZhCN
          ? '本地账户注册已被禁用。'
          : 'Local account registration is disabled.',
      };
    }

    return { registrationLocked: false, registrationMessage: undefined, isAdminInitMode: false };
  }, [config.localLoginForm, isZhCN]);

  const formDisabled = registrationLocked;

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
      await register(email, password, name || undefined, aliases || undefined);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Register failed');
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
              <CardTitle className="text-xl sm:text-2xl">注册</CardTitle>
              <CardDescription className="text-sm sm:text-base">创建您的 Summit AI 账户</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              {registrationMessage && (
                <Alert className="mb-4">
                  <AlertDescription>{registrationMessage}</AlertDescription>
                </Alert>
              )}

              {!formDisabled && (
                <>
                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">姓名</Label>
                      <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="真实姓名" className="w-full" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aliases">别称（可选）</Label>
                      <Input
                        id="aliases"
                        type="text"
                        value={aliases}
                        onChange={(e) => setAliases(e.target.value)}
                        placeholder="使用逗号分隔多个别称"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">例如：王局, 张总, 老李, 小明</p>
                    </div>

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
                      {loading ? '注册中...' : '注册'}
                    </Button>
                  </form>

                  <div className="mt-6 text-center text-sm">
                    已有账号？{' '}
                    <Link to="/login" className="text-primary hover:underline">
                      登录
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

export default Register;
