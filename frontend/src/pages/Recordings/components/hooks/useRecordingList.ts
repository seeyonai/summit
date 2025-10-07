import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { Recording } from '@/types';

export interface UseRecordingListReturn {
  recordings: Recording[];
  loading: boolean;
  error: string | null;
  fetchedAll: boolean | undefined;
  fetchRecordings: () => Promise<void>;
  loadAll: () => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  setError: (error: string | null) => void;
}

export function useRecordingList(): UseRecordingListReturn {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAll, setFetchedAll] = useState<boolean | undefined>(undefined);

  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await apiService.getRecordingsResponse();
      setRecordings(resp.recordings);
      setFetchedAll(resp.fetchedAll);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await apiService.getRecordingsResponse({ all: true });
      setRecordings(resp.recordings);
      setFetchedAll(resp.fetchedAll);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRecording = useCallback(async (id: string) => {
    try {
      await apiService.deleteRecording(id);
      await fetchRecordings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [fetchRecordings]);

  const refetch = useCallback(async () => {
    await fetchRecordings();
  }, [fetchRecordings]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  return {
    recordings,
    loading,
    error,
    fetchedAll,
    fetchRecordings,
    loadAll,
    deleteRecording,
    refetch,
    setError,
  };
}
