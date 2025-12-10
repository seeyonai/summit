import React, { useEffect, useState } from 'react';
import { searchUsers, updateProfile, deleteUser, type UserListItem } from '@/services/users';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import SearchInput from '@/components/SearchInput';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]);

  const updateRole = async (id: string, role: 'admin' | 'user') => {
    await api(`/api/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
    await load();
  };

  const startEditing = (user: UserListItem) => {
    setEditingId(user._id);
    setEditName(user.name || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveName = async (id: string) => {
    try {
      await updateProfile(id, { name: editName });
      setEditingId(null);
      setEditName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  const handleDelete = async (user: UserListItem) => {
    if (!window.confirm(`确定删除用户 ${user.name || user.email}？此操作不可撤销。`)) return;
    try {
      await deleteUser(user._id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">用户管理</h1>
      <div className="max-w-md mb-4">
        <SearchInput placeholder="搜索邮箱或姓名" value={q} onChange={setQ} />
      </div>
      {error && <div className="text-destructive text-sm mb-2">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">加载中...</div>}
      <div className="border rounded">
        <div className="grid grid-cols-4 gap-2 p-2 text-sm font-medium bg-muted/40">
          <div>姓名</div>
          <div>邮箱</div>
          <div className="col-span-2">操作</div>
        </div>
        {users.map((u) => (
          <div key={u._id} className="grid grid-cols-4 gap-2 p-2 border-t items-center">
            <div className="flex items-center gap-1">
              {editingId === u._id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName(u._id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveName(u._id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span>{u.name || '-'}</span>
                  {u.role === 'admin' && (
                    <Badge variant="secondary" className="ml-1">
                      管理员
                    </Badge>
                  )}
                </>
              )}
            </div>
            <div>{u.email}</div>
            <div className="col-span-2 space-x-2">
              <Button size="sm" variant="outline" disabled={editingId === u._id} onClick={() => startEditing(u)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={u.role === 'admin'} onClick={() => updateRole(u._id, 'admin')}>
                设为管理员
              </Button>
              <Button size="sm" variant="outline" disabled={u.role === 'user'} onClick={() => updateRole(u._id, 'user')}>
                设为普通用户
              </Button>
              <Button size="sm" variant="outline" disabled={u._id === currentUser?._id} onClick={() => handleDelete(u)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {users.length === 0 && !loading && <div className="p-3 text-sm text-muted-foreground">无结果</div>}
      </div>
    </div>
  );
}

export default AdminUsers;
