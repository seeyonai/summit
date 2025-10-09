import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import type { AgendaItem } from '@/types';
import type { UserListItem } from '@/services/users';

export function useAgendaOwners(agenda?: AgendaItem[]) {
  const [ownerCache, setOwnerCache] = useState<Record<string, UserListItem>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agenda) return;

    const ownerIds = agenda.filter(item => item.ownerId).map(item => item.ownerId!);
    const uniqueOwnerIds = Array.from(new Set(ownerIds));

    if (uniqueOwnerIds.length === 0) return;

    const fetchOwners = async () => {
      try {
        setLoading(true);
        const result = await api<{ users: UserListItem[] }>(`/api/users?ids=${uniqueOwnerIds.join(',')}`);
        const newCache: Record<string, UserListItem> = {};
        result.users.forEach(user => {
          newCache[user._id] = user;
        });
        setOwnerCache(newCache);
      } catch (error) {
        console.error('Failed to fetch owner information:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOwners();
  }, [agenda]);

  return { ownerCache, loading };
}

export function useAgendaStatus() {
  const getAgendaStatus = (item: AgendaItem, index: number, meetingStatus?: string) => {
    // Active status is determined by the item's own status, not position
    if (item.status === 'in_progress') {
      return 'active';
    }
    return 'pending';
  };

  const getAgendaProgress = (agenda?: AgendaItem[]) => {
    if (!agenda || agenda.length === 0) return { completed: 0, total: 0, percentage: 0 };

    const completed = agenda.filter(item => item.status === 'completed').length;
    const total = agenda.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const isActiveStatus = (status: AgendaItem['status']) => {
    return ['draft', 'scheduled', 'in_progress'].includes(status);
  };

  const isCompletedStatus = (status: AgendaItem['status']) => {
    return status === 'completed';
  };

  const isCancelledStatus = (status: AgendaItem['status']) => {
    return status === 'cancelled';
  };

  return {
    getAgendaStatus,
    getAgendaProgress,
    isActiveStatus,
    isCompletedStatus,
    isCancelledStatus
  };
}

export function useAgendaSort(agenda?: AgendaItem[]) {
  const sortedAgenda = agenda
    ? [...agenda].sort((a, b) => a.order - b.order)
    : [];

  return sortedAgenda;
}