import { useState, useCallback } from 'react';
import { apiService } from '@/services/api';

interface DisputedIssue {
  id: string;
  text: string;
  severity: 'low' | 'medium' | 'high';
  parties: string[];
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
}

interface AnalysisMetadata {
  totalChunks: number;
  processingTime: string;
}

interface AnalysisResult {
  success: boolean;
  data: {
    disputedIssues: DisputedIssue[];
    todos: TodoItem[];
    metadata: AnalysisMetadata;
  };
  message: string;
}

export const useDisputedIssues = (meetingId?: string) => {
  const [disputedIssues, setDisputedIssues] = useState<DisputedIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisMetadata, setAnalysisMetadata] = useState<AnalysisMetadata | null>(null);

  const extractAnalysis = useCallback(async () => {
    if (!meetingId) return;

    setLoading(true);
    setError(null);

    try {
      const result: AnalysisResult = await apiService.extractTranscriptAnalysis(meetingId);
      
      if (result.success) {
        setDisputedIssues(result.data.disputedIssues);
        setAnalysisMetadata(result.data.metadata);
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
    setDisputedIssues([]);
    setAnalysisMetadata(null);
    setError(null);
  }, []);

  return {
    disputedIssues,
    loading,
    error,
    analysisMetadata,
    extractAnalysis,
    clearAnalysis,
  };
};