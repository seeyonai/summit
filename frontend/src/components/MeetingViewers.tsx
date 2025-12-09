import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import UserPicker from '@/components/UserPicker';
import { useAuth } from '@/contexts/AuthContext';
import { api, apiService } from '@/services/api';
import { type UserListItem } from '@/services/users';

interface MeetingViewersProps {
  meetingId: string;
  ownerId?: string;
  members?: string[];
  viewers?: string[];
  onChanged?: () => void;
}

function MeetingViewers({ meetingId, ownerId, members = [], viewers = [], onChanged }: MeetingViewersProps) {
  const { user: currentUser } = useAuth();
  const [viewerUsers, setViewerUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const isOwner = !!currentUser && ownerId === currentUser._id;
  const isAdmin = !!currentUser && currentUser.role === 'admin';
  const canEdit = isOwner || isAdmin;

  useEffect(() => {
    if (viewers.length === 0) {
      setViewerUsers([]);
      return;
    }

    setLoading(true);
    api<{ users: UserListItem[] }>(`/api/users?ids=${viewers.join(',')}`)
      .then((data) => {
        const list: UserListItem[] = (data?.users || []).map((u: { _id: string; email: string; name?: string; aliases?: string; role: string }) => ({
          _id: u._id,
          email: u.email,
          name: u.name,
          aliases: u.aliases,
          role: u.role as 'admin' | 'user'
        }));
        setViewerUsers(list);
      })
      .catch(() => {
        setViewerUsers([]);
      })
      .finally(() => setLoading(false));
  }, [viewers]);

  const addViewer = async (user: UserListItem) => {
    await apiService.addMeetingViewer(meetingId, user._id);
    if (onChanged) onChanged();
  };

  const removeViewer = async (userId: string) => {
    await apiService.removeMeetingViewer(meetingId, userId);
    if (onChanged) onChanged();
  };

  // Exclude owner, members, and existing viewers from picker
  const excludeUserIds = [ownerId || '', ...members, ...viewers];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">查阅者管理</h3>
        <p className="text-sm text-muted-foreground">查阅者仅可查看"记录"和"AI 分析"标签页</p>
      </div>

      <div className="border rounded p-3">
        <div className="mb-2 text-sm text-muted-foreground">查阅者（只读，受限访问）</div>
        {loading && <div className="text-sm text-muted-foreground">加载中...</div>}
        {!loading && viewerUsers.length === 0 && <div className="text-sm text-muted-foreground">暂无查阅者</div>}
        <ul className="divide-y">
          {viewerUsers.map((u) => (
            <li key={u._id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              {canEdit && (
                <Button variant="outline" onClick={() => removeViewer(u._id)}>移除</Button>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <div className="mt-4">
            <UserPicker
              placeholder="通过邮箱/姓名搜索用户并添加"
              excludeUserIds={excludeUserIds}
              onSelect={addViewer}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingViewers;
