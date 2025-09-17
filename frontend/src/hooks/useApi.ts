import { useState, useCallback } from 'react';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export function useApi<T = unknown>(options: UseApiOptions = {}) {
  const { baseUrl = 'http://localhost:2591', headers = {} } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const request = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
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
  }, [baseUrl, headers]);

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
