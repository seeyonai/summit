import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiService } from '@/services/api';
import type { Meeting, MeetingUpdate } from '@/types';
import MeetingForm from '@/components/meetings/MeetingForm';
import {
  AlertCircleIcon
} from 'lucide-react';

function MeetingEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'info';
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchMeeting = async () => {
      try {
        setLoading(true);
        const data = await apiService.getMeeting(id);
        setMeeting(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load meeting');
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [id]);

  const handleSubmit = async (data: MeetingUpdate) => {
    if (!id || !meeting) return;

    try {
      setSaving(true);
      await apiService.updateMeeting(id, data);

      // Navigate back to meeting detail page
      navigate(`/meetings/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meeting');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/meetings/${id}`);
  };

  const handleMembersChanged = async () => {
    if (!id) return;
    try {
      const data = await apiService.getMeeting(id);
      setMeeting(data);
    } catch (err) {
      console.error('Failed to refresh meeting after members change:', err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>会议未找到</AlertTitle>
            <AlertDescription>请求的会议不存在或已被删除。</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                编辑会议
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                修改会议信息和设置
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>保存失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Meeting Form */}
        {meeting && (
          <MeetingForm
            mode="edit"
            initialData={meeting}
            meetingId={id}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onMembersChanged={handleMembersChanged}
            loading={saving}
            error={error}
            initialTab={initialTab}
          />
        )}
      </div>
    </div>
  );
}

export default MeetingEdit;
