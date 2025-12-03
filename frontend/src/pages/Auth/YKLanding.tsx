import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle } from '@/components/ui/alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import BackgroundPattern from '@/components/BackgroundPattern';
import { apiUrl } from '@/services/api';

/**
 * YK OAuth Landing Page
 *
 * This page serves as the callback URL for the YK OAuth provider.
 * It receives the OAuth callback parameters (code, state, provider)
 * and forwards them to the backend OAuth callback endpoint.
 *
 * Flow:
 * 1. YK OAuth provider redirects here with ?code=...&state=...&provider=...
 * 2. This page saves the state to a cookie (for CSRF verification)
 * 3. Then redirects to backend /api/auth/oauth/callback with the same params
 * 4. Backend handles user creation/login and redirects to /oauth/callback with internal code
 */
function YKLanding() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Parse OAuth params from URL
  const searchParams = new URLSearchParams(location.search);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const provider = searchParams.get('provider');

  useEffect(() => {
    // If OAuth params present, forward to backend callback
    if (code && state && provider) {
      setIsAuthenticating(true);

      // Save state to cookie for CSRF validation
      document.cookie = `oauth_state_summit=${state}; path=/; max-age=3600`;

      // Small delay to show loading state, then redirect to backend
      const timer = setTimeout(() => {
        const callbackUrl = apiUrl(`/api/auth/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&provider=${encodeURIComponent(provider)}`);
        window.location.href = callbackUrl;
      }, 800);

      return () => clearTimeout(timer);
    }

    // If no OAuth params, show error
    if (!code && !state && !provider) {
      setError('缺少OAuth参数。请通过登录页面开始认证流程。');
    }
  }, [code, state, provider]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-[#fafafa] relative text-gray-900">
      <BackgroundPattern />
      <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 relative z-10">
        <div className="text-center w-full max-w-md">
          {isAuthenticating ? (
            <>
              <LoadingSpinner className="mb-4 mx-auto" />
              <h1 className="text-xl sm:text-2xl font-semibold mb-2">
                正在处理登录...
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                请稍候，正在验证您的身份...
              </p>
            </>
          ) : error ? (
            <>
              <h1 className="text-xl sm:text-2xl font-semibold mb-4">
                认证错误
              </h1>
              <Alert variant="destructive" className="mb-4 text-left">
                <AlertTitle>错误</AlertTitle>
                {error}
              </Alert>
              <Button onClick={handleGoToLogin} className="w-full">
                返回登录
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6 sm:mb-8">
                <img src="/logo-square.png" alt="Summit AI" className="h-12 w-auto sm:h-16" />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold mb-2">
                欢迎使用 Summit AI
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">
                请通过登录页面开始认证
              </p>
              <Button onClick={handleGoToLogin} className="w-full">
                开始使用
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default YKLanding;

