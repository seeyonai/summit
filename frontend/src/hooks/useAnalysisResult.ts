import { useState, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '@/services/api';
import type { DisputedIssue, Todo } from '@/types/index';

interface AnalysisMetadata {
  totalChunks: number;
  processingTime: string;
}

interface AnalysisResultData {
  disputedIssues?: DisputedIssue[];
  todos?: Todo[];
}

interface AnalysisResultDataWithMeta extends AnalysisResultData {
  metadata?: AnalysisMetadata;
}

interface AnalysisResult {
  success?: boolean;
  data: AnalysisResultDataWithMeta;
  message?: string;
}

export interface AnalysisProgress {
  stage: 'chunk' | 'reduction';
  chunkIndex?: number;
  chunkCount?: number;
  status: 'start' | 'done' | 'error';
}

export const useAnalysisResult = (meetingId: string, initialData: AnalysisResultData) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>({
    success: true,
    data: initialData,
    message: 'Analysis result loaded from cache',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const extractAnalysis = useCallback(async () => {
    if (!meetingId) return;

    setLoading(true);
    setError(null);
    setProgress(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/meetings/${meetingId}/extract-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: '{}',
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        let msg = `请求失败，状态码 ${response.status}`;
        try {
          const json = JSON.parse(text);
          msg = json?.error?.message || json?.message || msg;
        } catch { /* use default */ }
        setError(msg);
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError('无法读取响应流');
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === 'progress') {
                setProgress(data);
              } else if (currentEvent === 'done') {
                setAnalysisResult(data);
                setProgress(null);
              } else if (currentEvent === 'error') {
                setError(data.message || '分析失败');
                setProgress(null);
              }
            } catch { /* skip malformed data */ }
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User aborted — silent discard
        setProgress(null);
      } else {
        setError('未知错误');
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [meetingId]);

  const abortExtraction = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setError(null);
  }, []);

  const clearDisputedIssues = useCallback(() => {
    setAnalysisResult(prev =>
      prev ? {
        ...prev,
        data: {
          ...prev.data,
          disputedIssues: []
        }
      } : null
    );
  }, []);

  const clearTodos = useCallback(() => {
    setAnalysisResult(prev =>
      prev ? {
        ...prev,
        data: {
          ...prev.data,
          todos: []
        }
      } : null
    );
  }, []);

  return {
    analysisResult,
    loading,
    error,
    progress,
    extractAnalysis,
    abortExtraction,
    clearAnalysis,
    clearDisputedIssues,
    clearTodos,
  };
};
