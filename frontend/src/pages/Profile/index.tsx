import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { authService } from '@/services/auth';
import { updateProfile } from '@/services/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState<string>('');
  const [aliases, setAliases] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [savingPwd, setSavingPwd] = useState<boolean>(false);

  useEffect(() => {
    setName(user?.name || '');
    setAliases(user?.aliases || '');
  }, [user?.name, user?.aliases, user?._id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfile(user?._id || '', { name, aliases });
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
          <Label className="block text-sm font-medium mb-1">邮箱</Label>
          <Input
            type="email"
            value={user?.email || ''}
            disabled
            className="bg-muted/40 text-muted-foreground"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium mb-1">显示名称</Label>
          <Input
            disabled={saving || user?.role !== 'admin'}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="姓名"
          />
          <p className="text-xs text-muted-foreground mt-1">留空以移除显示名称。</p>
        </div>
        <div>
          <Label className="block text-sm font-medium mb-1">别称</Label>
          <Input
            disabled={saving || user?.role !== 'admin'}
            type="text"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="使用逗号分隔多个别称"
          />
          <p className="text-xs text-muted-foreground mt-1">例如：王局, 张总, 老李, 小明</p>
        </div>
        <div>
          <Label className="block text-sm font-medium mb-1">角色</Label>
          <Input
            type="text"
            value={user?.role || ''}
            disabled
            className="bg-muted/40 text-muted-foreground"
          />
        </div>
        {user?.role === 'admin' && (
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? '保存中...' : '保存更改'}
            </Button>
          </div>
        )}
      </form>

      <div className="h-px w-full my-8 bg-border" />

      <h3 className="text-xl font-semibold mb-4">修改密码</h3>
      <form onSubmit={onChangePassword} className="space-y-6">
        <div>
          <Label className="block text-sm font-medium mb-1">当前密码</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium mb-1">新密码</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium mb-1">确认新密码</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={savingPwd}
          >
            {savingPwd ? '更新中...' : '更新密码'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
