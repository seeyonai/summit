import { api } from '@/services/api';

export interface UserListItem {
  _id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
}

export async function searchUsers(q: string): Promise<UserListItem[]> {
  const result = await api<{ users: UserListItem[] }>(`/api/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  return result.users;
}

