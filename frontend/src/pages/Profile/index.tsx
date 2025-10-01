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
      toast.success('Profile updated');
    } catch {
      // api layer will toast errors
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please enter current and new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      setSavingPwd(true);
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password updated');
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
      <h2 className="text-2xl font-bold mb-6">Your Profile</h2>
      <form onSubmit={onSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 rounded-md border border-border bg-muted/40 text-muted-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 rounded-md border border-input bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">Leave blank to remove your display name.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
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
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      <div className="h-px w-full my-8 bg-border" />

      <h3 className="text-xl font-semibold mb-4">Change Password</h3>
      <form onSubmit={onChangePassword} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Current Password</label>
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
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
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
            {savingPwd ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
