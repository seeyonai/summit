import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, user } = useAuth();
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get the intended destination from location state or default to meetings
  const from = (location.state as any)?.from?.pathname || '/meetings';

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
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img
            src="/logo-square.png"
            alt="Summit AI"
            className="h-16 w-auto"
          />
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">注册</CardTitle>
            <CardDescription>
              创建您的 Summit AI 账户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="真实姓名"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="aliases">别称（可选）</Label>
                <Input
                  id="aliases"
                  type="text"
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                  placeholder="使用逗号分隔多个别称"
                />
                <p className="text-xs text-muted-foreground">
                  例如：王局, 张总, 老李, 小明
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Register;
