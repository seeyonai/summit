import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Link2Icon } from 'lucide-react';
import type { Recording } from '@/types';
import { apiService } from '@/services/api';
import { useMeetings } from '@/hooks/useMeetings';

interface AssociateMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recording: Recording;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function AssociateMeetingDialog({
  isOpen,
  onClose,
  recording,
  onSuccess,
  onError
}: AssociateMeetingDialogProps) {
  const { meetings, loading: loadingMeetings, error, refetch } = useMeetings();
  const [associating, setAssociating] = useState(false);

  const handleAssociateToMeeting = async (meetingId: string) => {
    if (associating) return;
    
    try {
      setAssociating(true);
      
      await apiService.addRecordingToMeeting(meetingId, recording._id);
      onSuccess();
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : '关联失败');
    } finally {
      setAssociating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      refetch();
    }
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>关联到会议</DialogTitle>
          <DialogDescription>选择要将此录音关联到的会议</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400 mb-4">加载会议失败</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={refetch} variant="outline">
                  重试
                </Button>
                <Button onClick={onClose} variant="outline">
                  关闭
                </Button>
              </div>
            </div>
          ) : loadingMeetings ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">加载会议列表...</span>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">暂无可用会议</p>
              <Button onClick={onClose} variant="outline">
                关闭
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className={`flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                    associating ? 'pointer-events-none opacity-50' : ''
                  }`}
                  onClick={() => handleAssociateToMeeting(meeting._id)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{meeting.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={meeting.status === 'completed' ? 'default' : 
                                meeting.status === 'in_progress' ? 'secondary' : 
                                meeting.status === 'scheduled' ? 'outline' : 'destructive'}
                        className={
                          meeting.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          meeting.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          meeting.status === 'scheduled' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                          'bg-destructive dark:bg-destructive/30 text-red-700 dark:text-red-400'
                        }
                      >
                        {meeting.status === 'completed' ? '已完成' :
                         meeting.status === 'in_progress' ? '进行中' :
                         meeting.status === 'scheduled' ? '已排期' : '已取消'}
                      </Badge>
                      {meeting.scheduledStart && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(meeting.scheduledStart).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link2Icon className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AssociateMeetingDialog;