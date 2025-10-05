import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/date';
import type { Meeting, MeetingStatus } from '@/types';
import { Users, Mic, Calendar, Clock, CheckCircle, PlayIcon, TargetIcon, FileTextIcon, TrashIcon, MoreVertical } from 'lucide-react';

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
  const [showMenu, setShowMenu] = useState(false);
  const StatusIcon = getStatusIcon(meeting.status);
  const totalTodos = meeting.parsedTodos?.length || 0;
  const recordingCount = (meeting.recordings || []).filter((recording) => recording.source !== 'concatenated').length;

  return (
    <Card 
      className="group hover:shadow-md transition-all duration-300 cursor-pointer border-border dark:border-border overflow-hidden"
      onClick={() => navigate(`/meetings/${meeting._id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {meeting.title}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {formatDate(meeting.scheduledStart)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
              <>
                <Badge variant="outline" className={getStatusColor(meeting.status)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {getStatusText(meeting.status)}
                </Badge>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md h-auto justify-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onDelete(meeting._id, e);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                          删除
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col min-h-[80px]">
        {/* Meeting Summary */}
        <div className="py-3 rounded-lg mb-4 border-t border-border dark:border-border">
          {meeting.summary ? (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground line-clamp-2">
              {meeting.summary}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground italic">
              摘要尚未生成
            </p>
          )}
        </div>

        {/* Spacer to push content to bottom */}
        <div className="flex-1" />

        {/* Meeting Info */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{meeting.participants || 0} 人</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground">
            <Mic className="w-3 h-3" />
            <span>{recordingCount} 录音</span>
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

      </CardContent>
    </Card>
  );
}

export default MeetingCard;
