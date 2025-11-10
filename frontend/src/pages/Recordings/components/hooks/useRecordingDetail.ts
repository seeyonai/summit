import { useState, useEffect, useCallback } from 'react';
import { apiService, fileUrlFor } from '@/services/api';
import type { Recording } from '@/types';

export interface EditForm {
  label?: string;
  transcription?: string;
  verbatimTranscript?: string;
}

interface UseRecordingDetailOptions {
  recordingId?: string;
  recording?: Recording;
  onRefresh?: () => void | Promise<void>;
}

export function useRecordingDetail({ recordingId, recording: initialRecording, onRefresh }: UseRecordingDetailOptions = {}) {
  const [recording, setRecording] = useState<Recording | null>(initialRecording || null);
  const [loading, setLoading] = useState(!initialRecording);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({});

  const fetchRecording = useCallback(async () => {
    if (!recordingId) {
      setError('Missing recording identifier');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await apiService.getRecording(recordingId);
      setRecording(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [recordingId]);

  const refreshRecording = useCallback(async () => {
    if (recordingId) {
      await fetchRecording();
    } else if (initialRecording?._id) {
      try {
        const data = await apiService.getRecording(initialRecording._id);
        setRecording(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
    if (onRefresh) {
      await onRefresh();
    }
  }, [recordingId, initialRecording, fetchRecording, onRefresh]);

  const updateRecording = useCallback(async () => {
    if (!recording) return;
    try {
      const { message } = await apiService.updateRecording(recording._id, editForm);
      await refreshRecording();
      setIsEditing(false);
      setEditForm({});
      setSuccess(message || '录音更新成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [recording, editForm, refreshRecording]);

  const toggleEditing = useCallback(() => {
    if (!recording) return;

    if (isEditing) {
      setIsEditing(false);
      setEditForm({});
    } else {
      setEditForm({
        label: recording.label,
        transcription: recording.transcription,
        verbatimTranscript: recording.verbatimTranscript,
      });
      setIsEditing(true);
    }
  }, [recording, isEditing]);

  const handleDownloadRecording = useCallback(async () => {
    if (!recording) return;

    const fileUrl = recording._id;
    if (!fileUrl) {
      setError('无法获取录音文件路径');
      return;
    }

    try {
      const downloadUrl = fileUrlFor(fileUrl);
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('下载失败');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = (recording as any).label || (recording as any).originalFileName || `recording-${recording._id}.${recording.format || 'wav'}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      setSuccess('录音文件下载完成');
    } catch (err) {
      setError(err instanceof Error ? err.message : '下载失败');
    }
  }, [recording]);

  const deleteRecording = useCallback(async () => {
    if (!recording) return;
    try {
      await apiService.deleteRecording(recording._id);
      setSuccess('录音已删除');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  }, [recording]);

  useEffect(() => {
    if (recordingId && !initialRecording) {
      fetchRecording();
    } else if (initialRecording) {
      setRecording(initialRecording);
      setLoading(false);
    }
  }, [recordingId, initialRecording, fetchRecording]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [success, error]);

  return {
    recording,
    loading,
    error,
    success,
    isEditing,
    editForm,
    setEditForm,
    setSuccess,
    setError,
    fetchRecording: refreshRecording,
    updateRecording,
    toggleEditing,
    handleDownloadRecording,
    deleteRecording,
  };
}

