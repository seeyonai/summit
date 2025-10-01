import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Recording as BaseRecording } from '@base/types';
import type { Recording as FrontendRecording } from '@/types';

type Recording = BaseRecording | FrontendRecording;
import { formatDuration, formatFileSize, formatDate } from '@/utils/formatHelpers';
import { useAudioPlayback, audioUrlFor } from '@/hooks/useAudioPlayback';
import {
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  LinkIcon,
  CalendarIcon,
  ClockIcon,
  FolderOpenIcon,
  TrashIcon
} from 'lucide-react';

interface RecordingListItemProps {
  recording: Recording;
  actions?: {
    onAssociate?: (recording: Recording, e?: React.MouseEvent) => void;
    onDownload?: (recording: Recording, e?: React.MouseEvent) => void;
    onDelete?: (recording: Recording, e?: React.MouseEvent) => void;
  };
  onClick?: (recording: Recording) => void;
  className?: string;
}

function RecordingListItem({
  recording,
  actions = {},
  onClick,
  className = ''
}: RecordingListItemProps) {
  const { playingAudio, toggleAudioPlayback } = useAudioPlayback();
  
  const recordingId = ('_id' in recording ? recording._id : undefined) || recording.filename;

  const handleCardClick = () => {
    if (onClick) {
      onClick(recording);
    }
  };

  const handleAction = (actionFn?: (recording: Recording, e?: React.MouseEvent) => void) => 
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (actionFn) {
        actionFn(recording, e);
      }
    };

  // Default action handlers
  const defaultActions = {
    onDownload: (recording: Recording, e?: React.MouseEvent) => {
      e?.stopPropagation();
      window.open(audioUrlFor(recording.filename), '_blank');
    },
    ...actions
  };

  return (
    <div 
      className={`group bg-card rounded-lg border border-border hover:border-primary hover:shadow-md dark:hover:shadow-primary/10 transition-all duration-300 p-4 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-4">
        {/* Play Button */}
        <button
          onClick={(e) => toggleAudioPlayback(recordingId, audioUrlFor(recording.filename), e)}
          className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground shadow-lg dark:shadow-primary/20 hover:scale-105 transition-transform"
        >
          {playingAudio === recordingId ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Recording Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{recording.filename}</h3>
            {recording.transcription && (
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
                已转录
              </Badge>
            )}
            {recording.speakerSegments && recording.speakerSegments.length > 0 && (
              <Badge variant="secondary" className="bg-chart-4/10 text-chart-4 border-chart-4/20 text-xs">
                {recording.numSpeakers || '多'}人对话
              </Badge>
            )}
            {/* Meeting Status Badge */}
            {recording.meeting && (
              <Badge 
                variant="outline"
                className={
                  recording.meeting.status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                  recording.meeting.status === 'in_progress' ? 'bg-primary/10 text-primary border-primary/20' :
                  recording.meeting.status === 'scheduled' ? 'bg-muted text-muted-foreground border-border' :
                  'bg-destructive/10 text-destructive border-destructive/20'
                }
              >
                {recording.meeting.status === 'completed' ? '已完成' :
                 recording.meeting.status === 'in_progress' ? '进行中' :
                 recording.meeting.status === 'scheduled' ? '已排期' : '失败'}
              </Badge>
            )}
          </div>
          
          {/* Meeting Title */}
          {recording.meeting && (
            <div className="mb-1">
              <span className="text-sm text-muted-foreground">会议: </span>
              <span className="text-sm font-medium text-foreground">{recording.meeting.title}</span>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {formatDate(recording.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {formatDuration(recording.duration || 0)}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpenIcon className="w-3 h-3" />
              {formatFileSize(recording.fileSize || 0)}
            </span>
          </div>
          
          {recording.transcription && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
              {recording.transcription}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {defaultActions.onAssociate && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAction(defaultActions.onAssociate)}
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAction(defaultActions.onDownload)}
          >
            <DownloadIcon className="w-4 h-4" />
          </Button>
          
          {defaultActions.onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
              onClick={handleAction(defaultActions.onDelete)}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecordingListItem;
