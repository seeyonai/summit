import { useParams, useNavigate } from 'react-router-dom';
import { useMeetingDetail } from '@/hooks/useMeetingDetail';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import OngoingMeetingDisplay from './components/OngoingMeetingDisplay';

function OngoingMeetingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { meeting, loading, error } = useMeetingDetail(id);

  const handleClose = () => {
    navigate(`/meetings/${id}`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-background via-primary/20 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-muted/20 via-background/20 to-muted/20 flex items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{error || "会议不存在"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (meeting.status !== "in_progress") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-muted/20 via-background/20 to-muted/20 flex items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>该会议未在进行中</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <OngoingMeetingDisplay
      meeting={meeting}
      onClose={handleClose}
    />
  );
}

export default OngoingMeetingPage;
