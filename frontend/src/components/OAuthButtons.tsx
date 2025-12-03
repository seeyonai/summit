import { Button } from '@/components/ui/button';
import { apiUrl } from '@/services/api';
import type { OAuthButton } from '@/types';

interface OAuthButtonsProps {
  buttons: OAuthButton[];
  className?: string;
}

/**
 * OAuth login buttons component
 *
 * Renders a list of OAuth provider buttons based on the app configuration.
 * Clicking a button redirects to the backend OAuth landing endpoint,
 * which then redirects to the OAuth provider.
 */
function OAuthButtons({ buttons, className = '' }: OAuthButtonsProps) {
  // Detect browser language
  const browserLang = navigator.language.toLowerCase();
  const isZhCN = browserLang.startsWith('zh');

  const handleOAuthLogin = (provider: string) => {
    // Redirect to backend OAuth landing endpoint
    const landingUrl = apiUrl(`/api/auth/oauth/landing?provider=${encodeURIComponent(provider)}`);
    window.location.href = landingUrl;
  };

  if (!buttons || buttons.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {buttons.map((button, index) => {
        const displayName = isZhCN && button.displayName['zh-CN']
          ? button.displayName['zh-CN']
          : button.displayName.en;

        return (
          <Button
            key={`${button.provider}-${index}`}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => handleOAuthLogin(button.provider)}
          >
            {button.icon && (
              <img
                src={button.icon}
                alt=""
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  // Hide broken images
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            {displayName}
          </Button>
        );
      })}
    </div>
  );
}

export default OAuthButtons;

