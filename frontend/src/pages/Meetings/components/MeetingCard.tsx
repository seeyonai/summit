import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/date';
import type { Meeting, MeetingStatus } from '@/types';
import { Users, Mic, Calendar, Clock, CheckCircle, PlayIcon, EyeIcon, TargetIcon, FileTextIcon, TrashIcon } from 'lucide-react';

interface MeetingCardProps {
  meeting: Meeting;
  onDelete: (id: string, e?: React.MouseEvent) => void;
}

function getStatusColor(status: MeetingStatus) {
  switch (status) {
    case 'scheduled': return 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/80';
    case 'in_progress': return 'bg-success/10 dark:bg-success/20 text-success dark:text-success/80';
    case 'completed': return 'bg-muted text-muted-foreground';
    case 'failed': return 'bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-destructive/80';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getStatusText(status: MeetingStatus) {
  switch (status) {
    case 'scheduled': return '已排期';
    case 'in_progress': return '进行中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return status;
  }
}

function getStatusIcon(status: MeetingStatus) {
  switch (status) {
    case 'scheduled': return Calendar;
    case 'in_progress': return PlayIcon;
    case 'completed': return CheckCircle;
    default: return Clock;
  }
}

function MeetingCard({ meeting, onDelete }: MeetingCardProps) {
  const navigate = useNavigate();
  const StatusIcon = getStatusIcon(meeting.status);
  const totalTodos = meeting.parsedTodos?.length || 0;

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border dark:border-border overflow-hidden"
      onClick={() => navigate(`/meetings/${meeting._id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {meeting.title}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {formatDate(meeting.scheduledStart)}
            </CardDescription>
          </div>
          <Badge variant="outline" className={getStatusColor(meeting.status)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {getStatusText(meeting.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Meeting Summary */}
        {meeting.summary && (
          <div className="p-3 bg-muted dark:bg-muted rounded-lg">
            <p className="text-xs text-foreground dark:text-foreground line-clamp-2">
              {meeting.summary}
            </p>
          </div>
        )}

        {/* Meeting Info */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{meeting.participants || 0} 人</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground">
            <Mic className="w-3 h-3" />
            <span>{meeting.recordings?.length || 0} 录音</span>
          </div>
          {totalTodos > 0 ? (
            <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground">
              <TargetIcon className="w-3 h-3" />
              <span>{totalTodos} 任务</span>
            </div>
          ) : meeting.agenda && meeting.agenda.length > 0 ? (
            <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground">
              <FileTextIcon className="w-3 h-3" />
              <span>{meeting.agenda.length} 议程</span>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/meetings/${meeting._id}`);
            }}
          >
            <EyeIcon className="w-3 h-3 mr-1" />
            查看详情
          </Button>
          {meeting.status === 'in_progress' && (
            <Button
              size="sm"
              variant="outline"
              className="bg-success/10 hover:bg-success/20 text-success dark:bg-success/20 dark:hover:bg-success/30 dark:text-success/80"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/meetings/${meeting._id}`);
              }}
            >
              <Mic className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 dark:hover:bg-destructive/20"
            onClick={(e) => onDelete(meeting._id, e)}
          >
            <TrashIcon className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MeetingCard;
