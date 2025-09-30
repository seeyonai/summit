import { useState, useEffect } from 'react';
import type { Hotword } from '@/types';
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

  const createHotword = async (hotwordData: { word: string }) => {
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
    },
  };
};
