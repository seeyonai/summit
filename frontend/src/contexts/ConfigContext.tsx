/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppCustomization } from '@/types';
import { apiService } from '@/services/api';

type ConfigState = {
  config: AppCustomization;
  loading: boolean;
  error?: string;
};

const defaultConfig: AppCustomization = {
  appName: 'Summit AI',
  shortName: 'Summit',
  logoUrl: '/logo-rectangle.png',
  logoDarkUrl: '/logo-rectangle.png',
  faviconUrl: undefined,
};

const defaultState: ConfigState = { config: defaultConfig, loading: false };

const ConfigContext = createContext<ConfigState | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfigState>({ config: defaultConfig, loading: true });

  useEffect(() => {
    let mounted = true;
    apiService.getConfig()
      .then(cfg => {
        if (!mounted) return;
        const merged: AppCustomization = {
          ...defaultConfig,
          ...(cfg || {}),
        };
        setState({ config: merged, loading: false });
      })
      .catch(err => {
        if (!mounted) return;
        setState({ config: defaultConfig, loading: false, error: err?.message || 'Failed to load config' });
      });
    return () => { mounted = false; };
  }, []);

  // Side-effects: document title and favicon
  useEffect(() => {
    if (!state.loading && state.config?.appName) {
      try {
        document.title = state.config.appName;
      } catch {
        // ignore SSR
      }
    }
    if (!state.loading && state.config?.faviconUrl) {
      try {
        const link: HTMLLinkElement = document.querySelector('link[rel="icon"]') || document.createElement('link');
        link.rel = 'icon';
        link.href = String(state.config.faviconUrl);
        if (!link.parentNode) {
          document.head.appendChild(link);
        }
      } catch {
        // ignore
      }
    }
  }, [state.loading, state.config]);

  const value = useMemo(() => state, [state]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  return ctx || defaultState;
}
