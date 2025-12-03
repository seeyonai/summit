import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, AlertTitle } from '@/components/ui/alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import BackgroundPattern from '@/components/BackgroundPattern';

/**
 * OAuth Callback Page
 *
 * This page handles the final step of the OAuth flow.
 * After the backend validates the OAuth provider's callback and creates/updates the user,
 * it redirects here with an internal OAuth code.
 *
 * Flow:
 * 1. Backend redirects here with ?code=internalOAuthCode (or ?error=...&message=...)
 * 2. This page calls /api/auth/oauth/exchange?code=... to get JWT
 * 3. On success, stores token and redirects to dashboard
 * 4. On error, shows error message with option to go to login
 */
function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { exchangeOAuthCode } = useAuth();

  // Prevent double execution during React strict mode
  const exchangeAttempted = useRef(false);

  // Detect browser language
  const browserLang = navigator.language.toLowerCase();
  const isZhCN = browserLang.startsWith('zh');

  // Parse params from URL
  const searchParams = new URLSearchParams(location.search);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorMessage = searchParams.get('message');

  useEffect(() => {
    // Handle error from backend
    if (errorParam) {
      let displayError = errorMessage || errorParam;

      // Translate common error codes
      if (errorParam === 'account_already_exists') {
        displayError = isZhCN
          ? '该邮箱已使用其他登录方式注册，请使用原登录方式登录。'
          : 'An account with this email already exists but uses a different login method.';
      }

      setError(displayError);
      setIsLoading(false);
      return;
    }

    // Handle missing code
    if (!code) {
      setError(isZhCN
        ? '缺少授权码，请重新登录。'
        : 'Missing authorization code. Please try logging in again.');
      setIsLoading(false);
      return;
    }

    // Exchange code for JWT
    async function exchange() {
      // Prevent double execution
      if (exchangeAttempted.current) return;
      exchangeAttempted.current = true;

      try {
        await exchangeOAuthCode(code);

        // Success - redirect to dashboard
        console.info('🏠 OAuth login successful, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Failed to exchange OAuth code:', err);
        if (err instanceof Error) {
          setError(isZhCN
            ? `认证失败: ${err.message}`
            : `Authentication failed: ${err.message}`);
        } else {
          setError(isZhCN
            ? '认证服务连接失败'
            : 'Failed to connect to authentication service');
        }
      } finally {
        setIsLoading(false);
      }
    }

    exchange();
  }, [code, errorParam, errorMessage, exchangeOAuthCode, navigate, isZhCN]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-[#fafafa] relative text-gray-900">
      <BackgroundPattern />
      <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 relative z-10">
        <div className="text-center w-full max-w-md">
          {isLoading ? (
            <>
              <LoadingSpinner className="mb-4 mx-auto" />
              <h1 className="text-xl sm:text-2xl font-semibold mb-2">
                {isZhCN ? '正在完成登录...' : 'Completing Sign On...'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isZhCN ? '请稍候...' : 'Please wait...'}
              </p>
            </>
          ) : error ? (
            <>
              <h1 className="text-xl sm:text-2xl font-semibold mb-4">
                {isZhCN ? '认证错误' : 'Authentication Error'}
              </h1>
              <Alert variant="destructive" className="mb-4 text-left">
                <AlertTitle>{isZhCN ? '错误' : 'Error'}</AlertTitle>
                {error}
              </Alert>
              <Button onClick={handleGoToLogin} className="w-full">
                {isZhCN ? '返回登录' : 'Go to Login'}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default OAuthCallback;

