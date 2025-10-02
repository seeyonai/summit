import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/date';
import type { Meeting, MeetingStatus } from '@/types';
import { Users, Mic, Calendar, Clock, CheckCircle, PlayIcon, ChevronRightIcon, TrashIcon, MoreVertical } from 'lucide-react';

interface MeetingListItemProps {
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

function MeetingListItem({ meeting, onDelete }: MeetingListItemProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const StatusIcon = getStatusIcon(meeting.status);
  const completedTodos = meeting.parsedTodos?.filter(t => t.completed).length || 0;
  const totalTodos = meeting.parsedTodos?.length || 0;

  return (
    <div 
      className="group bg-background dark:bg-background rounded-lg border border-border dark:border-border hover:shadow-md transition-all duration-300 p-4 cursor-pointer"
      onClick={() => navigate(`/meetings/${meeting._id}`)}
    >
      <div className="flex items-center gap-4">
        {/* Status Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          meeting.status === 'in_progress' ? 'bg-success' :
          meeting.status === 'completed' ? 'bg-completed' :
          'bg-primary'
        } text-white`}>
          <StatusIcon className="w-5 h-5" />
        </div>

        {/* Meeting Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground dark:text-foreground truncate">{meeting.title}</h3>
            {meeting.status === 'in_progress' ? (
              <Button
                size="sm"
                variant="outline"
                className="bg-success/10 hover:bg-success/20 text-success dark:bg-success/20 dark:hover:bg-success/30 dark:text-success/80"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/meetings/${meeting._id}`);
                }}
              >
                <Mic className="w-3 h-3 mr-1" />
                进入会议
              </Button>
            ) : (
              <Badge variant="outline" className={getStatusColor(meeting.status)}>
                {getStatusText(meeting.status)}
              </Badge>
            )}
            {totalTodos > 0 && (
              <Badge variant="secondary" className="bg-success/10 text-success text-xs dark:bg-success/20 dark:text-success/80">
                {completedTodos}/{totalTodos} 任务
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(meeting.scheduledStart)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {meeting.participants || 0} 人
            </span>
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3" />
              {meeting.recordings?.length || 0} 录音
            </span>
          </div>
          {meeting.summary && (
            <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground line-clamp-1">
              {meeting.summary}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-32 rounded-md border border-border bg-popover shadow-md">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete(meeting._id, e);
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
          <ChevronRightIcon className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default MeetingListItem;
