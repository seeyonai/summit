import React, { useEffect, useState } from 'react';
import { searchUsers, type UserListItem } from '@/services/users';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';

function AdminUsers() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchUsers(q);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, load]);

  const updateRole = async (id: string, role: 'admin' | 'user') => {
    await api(`/api/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">用户管理</h1>
      <div className="max-w-md mb-4">
        <input
          placeholder="搜索邮箱或姓名"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">加载中...</div>}
      <div className="border rounded">
        <div className="grid grid-cols-5 gap-2 p-2 text-sm font-medium bg-muted/40">
          <div>姓名</div>
          <div>邮箱</div>
          <div>角色</div>
          <div className="col-span-2">操作</div>
        </div>
        {users.map((u) => (
          <div key={u._id} className="grid grid-cols-5 gap-2 p-2 border-t">
            <div>{u.name || '-'}</div>
            <div>{u.email}</div>
            <div className="capitalize">{u.role}</div>
            <div className="col-span-2 space-x-2">
              <Button size="sm" variant="outline" disabled={u.role === 'admin'} onClick={() => updateRole(u._id, 'admin')}>设为管理员</Button>
              <Button size="sm" variant="outline" disabled={u.role === 'user'} onClick={() => updateRole(u._id, 'user')}>设为普通用户</Button>
            </div>
          </div>
        ))}
        {users.length === 0 && !loading && (
          <div className="p-3 text-sm text-muted-foreground">无结果</div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;
