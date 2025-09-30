import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/auth';

type Role = 'admin' | 'user';

export interface AuthUser {
  _id: string;
  email: string;
  name?: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: { name?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    let active = true;
    setLoading(true);
    authService.me(token)
      .then((u) => { if (active) setUser(u); })
      .catch(() => { if (active) { setUser(null); setToken(null); localStorage.removeItem('auth_token'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const login = async (email: string, password: string) => {
    const { token: t, user: u } = await authService.login(email, password);
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser(u);
  };

  const register = async (email: string, password: string, name?: string) => {
    const { token: t, user: u } = await authService.register(email, password, name);
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try { localStorage.removeItem('auth_token'); } catch {}
  };

  const updateProfile = async (updates: { name?: string }) => {
    const updated = await authService.updateMe(updates);
    setUser(updated);
  };

  const value = useMemo(() => ({ user, token, loading, login, register, logout, updateProfile }), [user, token, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
