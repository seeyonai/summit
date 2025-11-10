import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { Note } from '@/types';

interface FetchNoteOptions {
  background?: boolean;
}

interface UseNoteDetailReturn {
  note: Note | null;
  loading: boolean;
  error: string | null;
  refresh: (options?: FetchNoteOptions) => Promise<void>;
  deleteNote: () => Promise<void>;
}

export function useNoteDetail(noteId: string | undefined): UseNoteDetailReturn {
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNote = useCallback(async (options?: FetchNoteOptions) => {
    if (!noteId) return;

    const isBackground = options?.background ?? false;

    try {
      if (!isBackground) {
        setLoading(true);
      }
      const data = await apiService.getNote(noteId);
      setNote(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [noteId]);

  const deleteNote = useCallback(async () => {
    if (!noteId) {
      return;
    }

    try {
      await apiService.deleteNote(noteId);
      navigate('/notes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [noteId, navigate]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  return {
    note,
    loading,
    error,
    refresh: fetchNote,
    deleteNote,
  };
}
