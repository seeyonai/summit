import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, fileUrlFor } from '@/services/api';
import type { Recording } from '@/types';

export interface EditForm {
  label?: string;
  transcription?: string;
  verbatimTranscript?: string;
}

export function useRecording() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({});

  const fetchRecording = useCallback(async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Missing recording identifier');
      const data = await apiService.getRecording(id);
      setRecording(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateRecording = useCallback(async () => {
    if (!recording) return;
    try {
      const { message } = await apiService.updateRecording(recording._id, editForm);
      await fetchRecording();
      setIsEditing(false);
      setEditForm({});
      setSuccess(message || '录音更新成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [recording, editForm, fetchRecording]);

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

  const generateTranscription = useCallback(async () => {
    try {
      if (!recording) throw new Error('Missing recording');
      const { message } = await apiService.transcribeRecording(recording._id);
      await fetchRecording();
      setSuccess(message || '转录生成成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [recording, fetchRecording]);

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
      // Navigate back to recordings list after a short delay
      setTimeout(() => {
        navigate('/recordings');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  }, [recording, navigate]);

  useEffect(() => {
    if (id) {
      fetchRecording();
    }
  }, [id, fetchRecording]);

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
    id,
    recording,
    loading,
    error,
    success,
    isEditing,
    editForm,
    setEditForm,
    setSuccess,
    setError,
    fetchRecording,
    updateRecording,
    toggleEditing,
    generateTranscription,
    handleDownloadRecording,
    deleteRecording,
  };
}
