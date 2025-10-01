import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import SearchInput from '@/components/SearchInput';
import { searchUsers, type UserListItem } from '@/services/users';
import { apiService, api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface MeetingMembersProps {
  meetingId: string;
  ownerId?: string;
  members?: string[];
  onChanged?: () => void;
}

function MeetingMembers({ meetingId, ownerId, members = [], onChanged }: MeetingMembersProps) {
  const { user: currentUser } = useAuth();
  const [memberUsers, setMemberUsers] = useState<UserListItem[]>([]);
  const [ownerUser, setOwnerUser] = useState<UserListItem | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserListItem[]>([]);
  const [, setLoading] = useState(false);
  const isOwner = !!currentUser && ownerId === currentUser._id;

  const memberIds = useMemo(() => new Set(members.map((m) => m)), [members]);

  useEffect(() => {
    // Fetch owner + members basic info
    const ids: string[] = [];
    if (ownerId) ids.push(ownerId);
    members.forEach((m) => ids.push(m));
    if (ids.length === 0) { setOwnerUser(null); setMemberUsers([]); return; }
    setLoading(true);
    api<{ users: UserListItem[] }>(`/api/users?ids=${ids.join(',')}`)
      .then((data) => {
        const list: UserListItem[] = (data?.users || []).map((u: { _id: string; email: string; name?: string; role: string }) => ({
          _id: u._id,
          email: u.email,
          name: u.name,
          role: u.role as 'admin' | 'user'
        }));
        const owner = list.find((u) => u._id === ownerId) || null;
        const membersOnly = list.filter((u) => u._id !== ownerId);
        setOwnerUser(owner);
        setMemberUsers(membersOnly);
      })
      .finally(() => setLoading(false));
  }, [meetingId, ownerId, members]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!q.trim()) { setResults([]); return; }
      try {
        const list = await searchUsers(q.trim());
        if (active) setResults(list);
      } catch {
        if (active) setResults([]);
      }
    };
    const timer = setTimeout(run, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [q]);

  const onAdd = async (userId: string) => {
    await apiService.addMeetingMember(meetingId, userId);
    if (onChanged) onChanged();
  };

  const onRemove = async (userId: string) => {
    await apiService.removeMeetingMember(meetingId, userId);
    if (onChanged) onChanged();
  };

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
              {isOwner && (
                <Button variant="outline" onClick={() => onRemove(u._id)}>移除</Button>
              )}
            </li>
          ))}
        </ul>

        {isOwner && (
          <div className="mt-4">
            <SearchInput
              placeholder="通过邮箱/姓名搜索用户并添加"
              value={q}
              onChange={setQ}
            />
            {q && (
              <div className="mt-2 border rounded max-h-64 overflow-auto">
                {results.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">无匹配结果</div>
                )}
                {results.map((u) => {
                  const disabled = u._id === ownerId || memberIds.has(u._id);
                  return (
                    <div key={u._id} className="p-2 flex items-center justify-between hover:bg-muted/40">
                      <div>
                        <div className="text-sm font-medium">{u.name || u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      <Button size="sm" disabled={disabled} onClick={() => onAdd(u._id)}>
                        {disabled ? '已添加' : '添加'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingMembers;
