import { api } from '@/services/api';
import type { AuthUser } from '@/contexts/AuthContext';

interface AuthResult {
  token: string;
  user: AuthUser;
}

export const authService = {
  async register(email: string, password: string, name?: string, aliases?: string): Promise<AuthResult> {
    return api<AuthResult>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, aliases }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  async login(email: string, password: string): Promise<AuthResult> {
    return api<AuthResult>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  async customSignOn(params: Record<string, string>): Promise<AuthResult> {
    return api<AuthResult>('/api/auth/custom-sign-on', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  async exchangeOAuthCode(code: string): Promise<AuthResult> {
    return api<AuthResult>(`/api/auth/oauth/exchange?code=${encodeURIComponent(code)}`, {
      method: 'GET',
    });
  },
  async me(token: string): Promise<AuthUser> {
    const result = await api<{ user: AuthUser }>('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return result.user;
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return api<{ message: string }>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
};
