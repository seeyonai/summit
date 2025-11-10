import { useState, useCallback, useEffect } from 'react';
import { apiService } from '@/services/api';
import type { Note } from '@/types';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAll, setFetchedAll] = useState<boolean | undefined>(undefined);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await apiService.getNotesResponse();
      setNotes(resp.items);
      setFetchedAll(resp.fetchedAll);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notes';
      setError(errorMessage);
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    loading,
    error,
    refetch,
    fetchedAll,
    loadAll: async () => {
      try {
        setLoading(true);
        const resp = await apiService.getNotesResponse({ all: true });
        setNotes(resp.items);
        setFetchedAll(resp.fetchedAll);
      } finally {
        setLoading(false);
      }
    },
    isEmpty: notes.length === 0 && !loading && !error
  };
}
