import { useState, useCallback, useEffect } from 'react';
import { apiService } from '@/services/api';
import type { Meeting } from '@/types';

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getMeetings();
      setMeetings(data);
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
    isEmpty: meetings.length === 0 && !loading && !error
  };
}