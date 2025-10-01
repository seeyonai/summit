import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { MeetingWithRecordings } from '@/types';

interface UseMeetingDetailReturn {
  meeting: MeetingWithRecordings | null;
  loading: boolean;
  error: string | null;
  showTranscript: boolean;
  showCombinedRecording: boolean;
  setShowTranscript: (show: boolean) => void;
  setShowCombinedRecording: (show: boolean) => void;
  refresh: () => Promise<void>;
  deleteMeeting: () => Promise<void>;
  handleRecordingComplete: (recordingData: {
    filename: string;
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
  const [showCombinedRecording, setShowCombinedRecording] = useState(false);

  const fetchMeeting = useCallback(async () => {
    if (!meetingId) return;
    
    try {
      setLoading(true);
      const data = await apiService.getMeeting(meetingId);
      setMeeting(data);
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
    filename: string;
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
            filename: recordingData.filename,
            filePath: `/files/${recordingData.filename}`,
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
    showCombinedRecording,
    setShowTranscript,
    setShowCombinedRecording,
    refresh: fetchMeeting,
    deleteMeeting,
    handleRecordingComplete,
  };
}
