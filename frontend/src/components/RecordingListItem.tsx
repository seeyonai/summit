import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/ui/item';
import type { Recording } from '@/types';

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
  TrashIcon,
  UploadIcon,
  RadioIcon,
  MergeIcon,
  HelpCircleIcon,
} from 'lucide-react';

interface RecordingListItemProps {
  recording: Recording;
  showSource?: boolean;
  actions?: {
    onAssociate?: (recording: Recording, e?: React.MouseEvent) => void;
    onDownload?: (recording: Recording, e?: React.MouseEvent) => void;
    onDelete?: (recording: Recording, e?: React.MouseEvent) => void;
  };
  onClick?: (recording: Recording) => void;
  className?: string;
}

function RecordingListItem({ recording, showSource = false, actions = {}, onClick, className = '' }: RecordingListItemProps) {
  const { playingAudio, toggleAudioPlayback } = useAudioPlayback();

  const recordingId = ('_id' in recording ? (recording as any)._id : '') as string;

  const getSourceIcon = (source?: 'live' | 'upload' | 'concatenated') => {
    switch (source) {
      case 'live':
        return RadioIcon;
      case 'upload':
        return UploadIcon;
      case 'concatenated':
        return MergeIcon;
      default:
        return HelpCircleIcon;
    }
  };

  const getSourceLabel = (source?: 'live' | 'upload' | 'concatenated') => {
    switch (source) {
      case 'live':
        return '实时录制';
      case 'upload':
        return '上传文件';
      case 'concatenated':
        return '拼接录音';
      default:
        return '未知来源';
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(recording);
    }
  };

  const handleAction = (actionFn?: (recording: Recording, e?: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionFn) {
      actionFn(recording, e);
    }
  };

  // Default action handlers
  const defaultActions = {
    onDownload: (recording: Recording, e?: React.MouseEvent) => {
      e?.stopPropagation();
      window.open(audioUrlFor(recordingId), '_blank');
    },
    ...actions,
  };

  return (
    <Item variant="outline" className={className} onClick={handleCardClick}>
      {/* Play Button as Media */}
      <ItemMedia>
        <button
          onClick={(e) => toggleAudioPlayback(recordingId, audioUrlFor(recordingId), e)}
          className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground shadow-lg dark:shadow-primary/20 hover:scale-105 transition-transform"
        >
          {playingAudio === recordingId ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
        </button>
      </ItemMedia>

      {/* Recording Content */}
      <ItemContent>
        <ItemTitle>
          {recording.label || (recording as any).originalFileName || recordingId}
          {/* Source Icon */}
          {showSource && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1 rounded-md bg-muted/50 hover:bg-muted transition-colors ml-2">
                    {(() => {
                      const SourceIcon = getSourceIcon(recording.source);
                      return <SourceIcon className="w-3.5 h-3.5 text-muted-foreground" />;
                    })()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getSourceLabel(recording.source)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {recording.transcription && (
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs ml-2">
              已转录
            </Badge>
          )}
          {recording.speakerSegments && recording.speakerSegments.length > 0 && (
            <Badge variant="secondary" className="bg-chart-4/10 text-chart-4 border-chart-4/20 text-xs ml-2">
              {recording.numSpeakers || '多'}人对话
            </Badge>
          )}
          {/* Meeting Status Badge */}
          {recording.meeting && (
            <Badge
              variant="outline"
              className={
                recording.meeting.status === 'completed'
                  ? 'bg-green-500/10 text-green-600 border-green-500/20 ml-2'
                  : recording.meeting.status === 'in_progress'
                  ? 'bg-primary/10 text-primary border-primary/20 ml-2'
                  : recording.meeting.status === 'scheduled'
                  ? 'bg-muted text-muted-foreground border-border ml-2'
                  : 'bg-destructive/10 text-destructive border-destructive/20 ml-2'
              }
            >
              {recording.meeting.status === 'completed'
                ? '已完成'
                : recording.meeting.status === 'in_progress'
                ? '进行中'
                : recording.meeting.status === 'scheduled'
                ? '已排期'
                : '已取消'}
            </Badge>
          )}
        </ItemTitle>

        {/* Meeting Title */}
        {recording.meeting && (
          <div className="mb-2">
            <span className="text-sm text-muted-foreground">会议: </span>
            <span className="text-sm font-medium text-foreground">{recording.meeting.title}</span>
          </div>
        )}

        <ItemDescription>
          <div className="flex items-center gap-4">
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

          {recording.transcription && <p className="mt-2 text-sm text-muted-foreground line-clamp-1">{recording.transcription}</p>}
        </ItemDescription>
      </ItemContent>

      {/* Actions */}
      <ItemActions>
        {defaultActions.onAssociate && (
          <Button size="sm" variant="ghost" onClick={handleAction(defaultActions.onAssociate)}>
            <LinkIcon className="w-4 h-4" />
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={handleAction(defaultActions.onDownload)}>
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
      </ItemActions>
    </Item>
  );
}

export default RecordingListItem;
