import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { authService } from '@/services/auth';

function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [savingPwd, setSavingPwd] = useState<boolean>(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name, user?._id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfile({ name });
      toast.success('个人资料已更新');
    } catch {
      // api layer will toast errors
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('请输入当前密码和新密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('新密码不匹配');
      return;
    }
    try {
      setSavingPwd(true);
      await authService.changePassword(currentPassword, newPassword);
      toast.success('密码已更新');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // api layer will toast errors
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">个人资料</h2>
      <form onSubmit={onSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">邮箱</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 rounded-md border border-border bg-muted/40 text-muted-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">显示名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="您的姓名"
            className="w-full px-3 py-2 rounded-md border border-input bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">留空以移除显示名称。</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">角色</label>
          <input
            type="text"
            value={user?.role || ''}
            disabled
            className="w-full px-3 py-2 rounded-md border border-border bg-muted/40 text-muted-foreground"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-60"
          >
            {saving ? '保存中...' : '保存更改'}
          </button>
        </div>
      </form>

      <div className="h-px w-full my-8 bg-border" />

      <h3 className="text-xl font-semibold mb-4">修改密码</h3>
      <form onSubmit={onChangePassword} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">当前密码</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background"
            autoComplete="current-password"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={savingPwd}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-60"
          >
            {savingPwd ? '更新中...' : '更新密码'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
