import { useState, useCallback } from 'react';
import { api } from '@/services/api';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiOptions {
  headers?: Record<string, string>;
}

export function useApi<T = unknown>(options: UseApiOptions = {}) {
  const { headers = {} } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const request = useCallback(async (
    endpoint: string,
    reqOptions: RequestInit = {}
  ): Promise<T> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await api<T>(endpoint, {
        headers,
        ...reqOptions,
      });
      setState(prev => ({ ...prev, data, loading: false }));
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        loading: false 
      }));
      throw error;
    }
  }, [headers]);

  const get = useCallback((endpoint: string) => {
    return request(endpoint, { method: 'GET' });
  }, [request]);

  const post = useCallback((endpoint: string, data?: unknown) => {
    return request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }, [request]);

  const put = useCallback((endpoint: string, data?: unknown) => {
    return request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }, [request]);

  const del = useCallback((endpoint: string) => {
    return request(endpoint, { method: 'DELETE' });
  }, [request]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    get,
    post,
    put,
    delete: del,
    clearError
  };
}
