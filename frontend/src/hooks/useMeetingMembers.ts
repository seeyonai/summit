import { useEffect, useState } from 'react';
import { api, apiService } from '@/services/api';
import { type UserListItem } from '@/services/users';

interface UseMeetingMembersProps {
  meetingId: string;
  ownerId?: string;
  members?: string[];
  viewers?: string[];
  onChanged?: () => void;
}

function useMeetingMembers({ meetingId, ownerId, members = [], viewers = [], onChanged }: UseMeetingMembersProps) {
  const [memberUsers, setMemberUsers] = useState<UserListItem[]>([]);
  const [viewerUsers, setViewerUsers] = useState<UserListItem[]>([]);
  const [ownerUser, setOwnerUser] = useState<UserListItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Serialize arrays to strings to avoid reference comparison issues in useEffect
  const membersKey = members.join(',');
  const viewersKey = viewers.join(',');

  useEffect(() => {
    const memberIds = membersKey ? membersKey.split(',') : [];
    const viewerIds = viewersKey ? viewersKey.split(',') : [];

    const ids: string[] = [];
    if (ownerId) ids.push(ownerId);
    memberIds.forEach((m) => ids.push(m));
    viewerIds.forEach((v) => ids.push(v));

    if (ids.length === 0) {
      setOwnerUser((prev) => (prev !== null ? null : prev));
      setMemberUsers((prev) => (prev.length > 0 ? [] : prev));
      setViewerUsers((prev) => (prev.length > 0 ? [] : prev));
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
          role: u.role as 'admin' | 'user',
        }));
        const owner = list.find((u) => u._id === ownerId) || null;
        const memberSet = new Set(memberIds);
        const viewerSet = new Set(viewerIds);
        const membersOnly = list.filter((u) => u._id !== ownerId && memberSet.has(u._id));
        const viewersOnly = list.filter((u) => viewerSet.has(u._id));
        setOwnerUser(owner);
        setMemberUsers(membersOnly);
        setViewerUsers(viewersOnly);
      })
      .catch(() => {
        setOwnerUser(null);
        setMemberUsers([]);
        setViewerUsers([]);
      })
      .finally(() => setLoading(false));
  }, [meetingId, ownerId, membersKey, viewersKey]);

  const addMember = async (user: UserListItem) => {
    await apiService.addMeetingMember(meetingId, user._id);
    if (onChanged) onChanged();
  };

  const removeMember = async (userId: string) => {
    await apiService.removeMeetingMember(meetingId, userId);
    if (onChanged) onChanged();
  };

  const addViewer = async (user: UserListItem) => {
    await apiService.addMeetingViewer(meetingId, user._id);
    if (onChanged) onChanged();
  };

  const removeViewer = async (userId: string) => {
    await apiService.removeMeetingViewer(meetingId, userId);
    if (onChanged) onChanged();
  };

  return {
    memberUsers,
    viewerUsers,
    ownerUser,
    loading,
    addMember,
    removeMember,
    addViewer,
    removeViewer,
  };
}

export default useMeetingMembers;
