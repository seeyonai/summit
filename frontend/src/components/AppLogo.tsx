import React, { useEffect, useState } from 'react';
import { useTheme } from '@/layout/useTheme';
import { useConfig } from '@/contexts/ConfigContext';
import { useBackendStatus } from '@/hooks/useBackendStatus';

function AppLogo() {
  const { theme } = useTheme();
  const { config } = useConfig();
  const backendStatus = useBackendStatus();
  const [animate, setAnimate] = useState(false);
  const logo = (theme === 'dark' ? (config.logoDarkUrl || config.logoUrl) : (config.logoUrl || config.logoDarkUrl)) || '/logo-rectangle.png';

  const statusConfig = {
    connected: {
      color: 'bg-success',
      transitionAnimation: 'animate-emit',
      persistentAnimation: ''
    },
    disconnected: {
      color: 'bg-destructive',
      transitionAnimation: 'animate-bounce-soft',
      persistentAnimation: 'animate-pulse-soft'
    },
    connecting: {
      color: 'bg-warning',
      transitionAnimation: 'animate-fade-in-scale',
      persistentAnimation: 'animate-pulse'
    }
  };

  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 600);
    return () => clearTimeout(timer);
  }, [backendStatus]);

  const { color, transitionAnimation, persistentAnimation } = statusConfig[backendStatus];

  return (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <img src={logo} alt={config.appName || 'App'} className="h-8 w-auto" />
        <div className={`absolute -top-1 -right-1 w-3 h-3 ${color} rounded-full border-2 border-background transition-all duration-300 ${animate ? transitionAnimation : persistentAnimation}`}></div>
      </div>
      <h1 className="text-2xl gradient-text" style={{ fontFamily: 'Impact, "Arial Narrow", "Helvetica Neue Condensed"' }}>{config.appName || 'Summit AI'}</h1>
    </div>
  );
}

export default AppLogo;
