import { useEffect, useState } from 'react';
import { api, apiService } from '@/services/api';
import { type UserListItem } from '@/services/users';

interface UseMeetingMembersProps {
  meetingId: string;
  ownerId?: string;
  members?: string[];
  onChanged?: () => void;
}

function useMeetingMembers({ meetingId, ownerId, members = [], onChanged }: UseMeetingMembersProps) {
  const [memberUsers, setMemberUsers] = useState<UserListItem[]>([]);
  const [ownerUser, setOwnerUser] = useState<UserListItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ids: string[] = [];
    if (ownerId) ids.push(ownerId);
    members.forEach((m) => ids.push(m));
    
    if (ids.length === 0) {
      setOwnerUser((prev) => (prev !== null ? null : prev));
      setMemberUsers((prev) => (prev.length > 0 ? [] : prev));
      return;
    }

    setLoading(true);
    api<{ users: UserListItem[] }>(`/api/users?ids=${ids.join(',')}`)
      .then((data) => {
        const list: UserListItem[] = (data?.users || []).map((u: { _id: string; email: string; name?: string; aliases?: string; role: string }) => ({
          _id: u._id,
          email: u.email,
          name: u.name,
          aliases: u.aliases,
          role: u.role as 'admin' | 'user'
        }));
        const owner = list.find((u) => u._id === ownerId) || null;
        const membersOnly = list.filter((u) => u._id !== ownerId);
        setOwnerUser(owner);
        setMemberUsers(membersOnly);
      })
      .catch(() => {
        setOwnerUser(null);
        setMemberUsers([]);
      })
      .finally(() => setLoading(false));
  }, [meetingId, ownerId, members]);

  const addMember = async (user: UserListItem) => {
    await apiService.addMeetingMember(meetingId, user._id);
    if (onChanged) onChanged();
  };

  const removeMember = async (userId: string) => {
    await apiService.removeMeetingMember(meetingId, userId);
    if (onChanged) onChanged();
  };

  return {
    memberUsers,
    ownerUser,
    loading,
    addMember,
    removeMember
  };
}

export default useMeetingMembers;
