import { useState, useEffect } from 'react';
import type { Hotword, HotwordBulkImportResult, HotwordCreate, HotwordImportResponse } from '@/types';
import type { HotwordService } from '@/services/hotwordService';

export const useHotwords = (hotwordService: HotwordService) => {
  const [hotwords, setHotwords] = useState<Hotword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHotwords = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await hotwordService.getHotwords();
      setHotwords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hotwords');
    } finally {
      setLoading(false);
    }
  };

  const createHotword = async (hotwordData: HotwordCreate) => {
    setLoading(true);
    setError(null);

    try {
      const newHotword = await hotwordService.createHotword(hotwordData);
      setHotwords(prev => [...prev, newHotword]);
      return newHotword;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hotword');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateHotword = async (hotwordId: string, updates: Partial<Hotword>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedHotword = await hotwordService.updateHotword({
        _id: hotwordId,
        ...updates,
      });
      setHotwords(prev =>
        prev.map(h => (h._id === hotwordId ? updatedHotword : h))
      );
      return updatedHotword;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update hotword');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteHotword = async (hotwordId: string) => {
    setLoading(true);
    setError(null);

    try {
      await hotwordService.deleteHotword(hotwordId);
      setHotwords(prev => prev.filter(h => h._id !== hotwordId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete hotword');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleHotwordStatus = async (hotwordId: string, isActive: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const updatedHotword = await hotwordService.toggleHotwordStatus(hotwordId, isActive);
      setHotwords(prev =>
        prev.map(h => (h._id === hotwordId ? updatedHotword : h))
      );
      return updatedHotword;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle hotword status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importHotwordsBulk = async (words: string[], isPublic?: boolean): Promise<HotwordBulkImportResult> => {
    setLoading(true);
    setError(null);

    try {
      const result = await hotwordService.importHotwordsBulk(words, isPublic);
      if (result.created && result.created.length > 0) {
        setHotwords(prev => [...prev, ...result.created]);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import hotwords');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importHotwordsFromFile = async (file: File, options?: { isPublic?: boolean }): Promise<HotwordImportResponse> => {
    setLoading(true);
    setError(null);

    try {
      const result = await hotwordService.importHotwordsFromFile(file, options);
      if (Array.isArray(result.created) && result.created.length > 0) {
        setHotwords(prev => [...prev, ...result.created]);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import hotwords');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const exportHotwords = async (): Promise<{ blob: Blob; filename: string }> => {
    setError(null);
    try {
      return await hotwordService.exportHotwords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export hotwords');
      throw err;
    }
  };

  useEffect(() => {
    fetchHotwords();
  }, []);

  return {
    hotwords,
    loading,
    error,
    actions: {
      fetchHotwords,
      createHotword,
      updateHotword,
      deleteHotword,
      toggleHotwordStatus,
      importHotwordsBulk,
      importHotwordsFromFile,
      exportHotwords,
    },
  };
};
