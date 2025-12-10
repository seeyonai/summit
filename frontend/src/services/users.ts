import { api } from '@/services/api';
import type { AuthUser } from '../contexts/AuthContext';

export interface UserListItem {
  _id: string;
  email: string;
  name?: string;
  aliases?: string;
  role: 'admin' | 'user';
}

export async function searchUsers(q: string): Promise<UserListItem[]> {
  const result = await api<{ users: UserListItem[] }>(`/api/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  return result.users;
}

export async function updateProfile(userId: string, updates: { name?: string; aliases?: string }): Promise<AuthUser> {
  const result = await api<{ user: AuthUser }>(`/api/users/${userId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result.user;
}

export async function deleteUser(userId: string): Promise<void> {
  await api(`/api/users/${userId}`, { method: 'DELETE' });
}
