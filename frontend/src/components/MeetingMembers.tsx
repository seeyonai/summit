import React from 'react';
import { Button } from '@/components/ui/button';
import UserPicker from '@/components/UserPicker';
import { useAuth } from '@/contexts/AuthContext';
import useMeetingMembers from '@/hooks/useMeetingMembers';

interface MeetingMembersProps {
  meetingId: string;
  ownerId?: string;
  members?: string[];
  onChanged?: () => void;
}

function MeetingMembers({ meetingId, ownerId, members = [], onChanged }: MeetingMembersProps) {
  const { user: currentUser } = useAuth();
  const { memberUsers, ownerUser, addMember, removeMember } = useMeetingMembers({
    meetingId,
    ownerId,
    members,
    onChanged
  });

  const isOwner = !!currentUser && ownerId === currentUser._id;
  const isAdmin = !!currentUser && currentUser.role === 'admin';
  const canEdit = isOwner || isAdmin;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">成员管理</h3>
        <p className="text-sm text-muted-foreground">会议仅限所有者与成员访问</p>
      </div>

      <div className="border rounded p-3">
        <div className="mb-2 text-sm text-muted-foreground">所有者</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{ownerUser?.name || ownerUser?.email || ownerId}</div>
            <div className="text-xs text-muted-foreground">{ownerUser?.email}</div>
          </div>
          <div className="text-xs">所有权限</div>
        </div>
      </div>

      <div className="border rounded p-3">
        <div className="mb-2 text-sm text-muted-foreground">成员（只读）</div>
        {memberUsers.length === 0 && <div className="text-sm text-muted-foreground">暂无成员</div>}
        <ul className="divide-y">
          {memberUsers.map((u) => (
            <li key={u._id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              {canEdit && (
                <Button variant="outline" onClick={() => removeMember(u._id)}>移除</Button>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <div className="mt-4">
            <UserPicker
              placeholder="通过邮箱/姓名搜索用户并添加"
              excludeUserIds={[ownerId || '', ...members]}
              onSelect={addMember}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingMembers;
