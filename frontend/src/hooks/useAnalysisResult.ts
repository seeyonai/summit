import { useState, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { DisputedIssue, Todo } from '@/types/index';

interface AnalysisMetadata {
  totalChunks: number;
  processingTime: string;
}

interface AnalysisResultData {
  disputedIssues: DisputedIssue[];
  todos: Todo[];
}

interface AnalysisResultDataWithMeta extends AnalysisResultData {
  metadata?: AnalysisMetadata;
}

interface AnalysisResult {
  success?: boolean;
  data: AnalysisResultDataWithMeta;
  message?: string;
}

export const useAnalysisResult = (meetingId: string, initialData: AnalysisResultData) => {
  const [AnalysisResult, setAnalysisResult] = useState<AnalysisResult | null>({
    success: true,
    data: initialData,
    message: 'Analysis result loaded from cache',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractAnalysis = useCallback(async () => {
    if (!meetingId) return;

    setLoading(true);
    setError(null);

    try {
      const result: AnalysisResult = await apiService.extractTranscriptAnalysis(meetingId);
      
      if (result.success) {
        setAnalysisResult(result);
      } else {
        setError(result.message || 'Failed to extract analysis');
      }
    } catch {
      setError('Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setError(null);
  }, []);

  return {
    AnalysisResult,
    loading,
    error,
    extractAnalysis,
    clearAnalysis,
  };
};
