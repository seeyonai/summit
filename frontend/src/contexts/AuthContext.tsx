import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/auth';

type Role = 'admin' | 'user';

export interface AuthUser {
  _id: string;
  email: string;
  name?: string;
  aliases?: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, aliases?: string) => Promise<void>;
  customSignOn: (params: Record<string, string>) => Promise<void>;
  exchangeOAuthCode: (code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

const storedToken = getStoredToken();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(storedToken);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!storedToken);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    authService
      .me(token)
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('auth_token');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    const { token: t, user: u } = await authService.login(email, password);
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser(u);
  };

  const register = async (email: string, password: string, name?: string, aliases?: string) => {
    const { token: t, user: u } = await authService.register(email, password, name, aliases);
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser(u);
  };

  const customSignOn = async (params: Record<string, string>) => {
    const { token: t, user: u } = await authService.customSignOn(params);
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser(u);
  };

  const exchangeOAuthCode = async (code: string) => {
    const { token: t, user: u } = await authService.exchangeOAuthCode(code);
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('auth_token');
    } catch {
      // Ignore localStorage errors
    }
  };

  const value = useMemo(() => ({ user, setUser, token, loading, login, register, customSignOn, exchangeOAuthCode, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthOptional() {
  return useContext(AuthContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useAuthOptional();
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
