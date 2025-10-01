import { useState, useCallback, useEffect } from 'react';
import { apiService } from '@/services/api';
import type { Meeting } from '@/types';

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAll, setFetchedAll] = useState<boolean | undefined>(undefined);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await apiService.getMeetingsResponse();
      setMeetings(resp.meetings);
      setFetchedAll(resp.fetchedAll);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch meetings';
      setError(errorMessage);
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    loading,
    error,
    refetch,
    fetchedAll,
    loadAll: async () => {
      try {
        setLoading(true);
        const resp = await apiService.getMeetingsResponse({ all: true });
        setMeetings(resp.meetings);
        setFetchedAll(resp.fetchedAll);
      } finally {
        setLoading(false);
      }
    },
    isEmpty: meetings.length === 0 && !loading && !error
  };
}
