import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { MeetingWithRecordings } from '@/types';

const sanitizeRecordingOrder = (
  order: MeetingWithRecordings['recordingOrder']
): MeetingWithRecordings['recordingOrder'] => {
  if (!Array.isArray(order)) {
    return [];
  }

  const sanitized = order
    .map((entry, idx) => {
      if (!entry) {
        return null;
      }
      const recordingId = typeof entry.recordingId === 'string'
        ? entry.recordingId
        : entry.recordingId?.toString?.();
      if (!recordingId) {
        return null;
      }
      return {
        recordingId,
        index: typeof entry.index === 'number' ? entry.index : idx,
        enabled: entry.enabled !== false,
      };
    })
    .filter((value): value is { recordingId: string; index: number; enabled: boolean } => value !== null)
    .sort((a, b) => a.index - b.index)
    .map((entry, idx) => ({
      ...entry,
      index: idx,
    }));

  return sanitized;
};

const withOrderedRecordings = (
  meeting: MeetingWithRecordings
): MeetingWithRecordings => {
  const recordings = Array.isArray(meeting.recordings) ? meeting.recordings : [];
  const recordingOrder = sanitizeRecordingOrder(meeting.recordingOrder) || [];

  if (recordings.length === 0) {
    return {
      ...meeting,
      recordings,
      recordingOrder,
    };
  }

  const knownIds = new Set(recordingOrder.map((entry) => entry.recordingId));
  const appended = recordings
    .filter((recording) => !knownIds.has(recording._id))
    .map((recording, idx) => ({
      recordingId: recording._id,
      index: recordingOrder.length + idx,
      enabled: true,
    }));

  const combinedOrder = [...recordingOrder, ...appended]
    .map((entry, idx) => ({
      ...entry,
      index: idx,
    }));

  const orderMap = new Map(combinedOrder.map((entry) => [entry.recordingId, entry.index]));
  const fallbackIndex = combinedOrder.length;

  const sortedRecordings = recordings.slice().sort((a, b) => {
    const indexA = orderMap.get(a._id) ?? fallbackIndex;
    const indexB = orderMap.get(b._id) ?? fallbackIndex;
    if (indexA === indexB) {
      return 0;
    }
    return indexA - indexB;
  });

  return {
    ...meeting,
    recordings: sortedRecordings,
    recordingOrder: combinedOrder,
  };
};

interface UseMeetingDetailReturn {
  meeting: MeetingWithRecordings | null;
  loading: boolean;
  error: string | null;
  showTranscript: boolean;
  showConcatenatedRecording: boolean;
  setShowTranscript: (show: boolean) => void;
  setShowConcatenatedRecording: (show: boolean) => void;
  refresh: () => Promise<void>;
  deleteMeeting: () => Promise<void>;
  handleRecordingComplete: (recordingData: {
    duration: number;
    downloadUrl?: string;
    transcription?: string;
  }) => Promise<void>;
}

export function useMeetingDetail(meetingId: string | undefined): UseMeetingDetailReturn {
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<MeetingWithRecordings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showConcatenatedRecording, setShowConcatenatedRecording] = useState(false);

  const fetchMeeting = useCallback(async () => {
    if (!meetingId) return;
    
    try {
      setLoading(true);
      const data = await apiService.getMeeting(meetingId);
      setMeeting(withOrderedRecordings(data));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  const deleteMeeting = useCallback(async () => {
    if (!meetingId || !confirm('确定要删除这个会议吗？此操作不可撤销。')) {
      return;
    }

    try {
      await apiService.deleteMeeting(meetingId);
      navigate('/meetings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [meetingId, navigate]);

  const handleRecordingComplete = useCallback(async (recordingData: {
    duration: number;
    downloadUrl?: string;
    transcription?: string;
  }) => {
    if (!meeting) return;

    try {
      // Update meeting with new recording
      const updatedMeeting = {
        ...meeting,
        recordings: [
          ...meeting.recordings,
          {
            originalFileName: undefined,
            duration: recordingData.duration,
            ...(recordingData.transcription ? { transcription: recordingData.transcription } : {}),
          }
        ]
      };
      
      await apiService.updateMeeting(meeting._id, updatedMeeting);
      await fetchMeeting();
    } catch (err) {
      console.error('Failed to update meeting with recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to update meeting');
    }
  }, [meeting, fetchMeeting]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  return {
    meeting,
    loading,
    error,
    showTranscript,
    showConcatenatedRecording,
    setShowTranscript,
    setShowConcatenatedRecording,
    refresh: fetchMeeting,
    deleteMeeting,
    handleRecordingComplete,
  };
}
