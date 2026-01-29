import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TranscriptionPreview from '@/components/TranscriptionPreview';
import type { Recording } from '@/types';

import { formatDuration, formatFileSize, formatDate } from '@/utils/formatHelpers';
import { useAudioPlayback, audioUrlFor } from '@/hooks/useAudioPlayback';
import {
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  FileAudioIcon,
  ClockIcon,
  Volume2Icon,
  EyeIcon,
  LinkIcon,
  CheckCircleIcon,
  UsersIcon,
  TrashIcon,
} from 'lucide-react';
import { getSourceIcon, getSourceLabel } from '@/utils/recordingSource';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const downloadAudioFile = async (recordingId: string, fileName?: string) => {
  try {
    const response = await fetch(audioUrlFor(recordingId));
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `${recordingId}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download audio file:', error);
  }
};

interface RecordingCardProps {
  recording: Recording;
  variant?: 'default' | 'concatenated' | 'compact';
  showMeetingInfo?: boolean;
  showTranscriptionPreview?: boolean;
  showSource?: boolean;
  showActions?: boolean;
  actions?: {
    onView?: (recording: Recording, e?: React.MouseEvent) => void;
    onAssociate?: (recording: Recording, e?: React.MouseEvent) => void;
    onDownload?: (recording: Recording, e?: React.MouseEvent) => void;
    onDelete?: (recording: Recording, e?: React.MouseEvent) => void;
  };
  onClick?: (recording: Recording) => void;
}

function RecordingCard({
  recording,
  variant = 'default',
  showMeetingInfo = true,
  showTranscriptionPreview = false,
  showSource = false,
  showActions = true,
  actions = {},
  onClick,
}: RecordingCardProps) {
  const { playingAudio, toggleAudioPlayback, stopAllAudio } = useAudioPlayback();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);
  const recordingId = ('_id' in recording ? (recording as any)._id : '') as string;
  const hasTranscription = !!recording.transcription;
  const hasSpeakers = recording.speakerSegments && recording.speakerSegments.length > 0;
  const numSpeakers = recording.numSpeakers || (hasSpeakers ? new Set(recording.speakerSegments?.map((s) => s.speakerIndex)).size : 0);

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
    onView: (recording: Recording, e?: React.MouseEvent) => {
      e?.stopPropagation();
      navigate(`/recordings/${'_id' in recording ? (recording as any)._id : ''}`);
    },
    onDownload: (recording: Recording, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const fileName = recording.label || (recording as any).originalFileName || `${recordingId}.${recording.format || 'wav'}`;
      downloadAudioFile(recordingId, fileName);
    },
    ...actions,
  };

  const getWaveformBars = () => {
    const barCount = variant === 'compact' ? 25 : 40;
    const colorClasses =
      variant === 'concatenated'
        ? 'from-primary/30 to-accent/30 dark:from-primary/40 dark:to-accent/40'
        : 'from-primary/60 to-primary/60 dark:from-primary/70 dark:to-primary/70';

    return Array.from({ length: barCount }).map((_, i) => (
      <div
        key={i}
        className={`flex-1 bg-gradient-to-t ${colorClasses} rounded-full opacity-40 dark:opacity-50`}
        style={{
          height: `${Math.random() * 100}%`,
          animationDelay: `${i * 0.05}s`,
        }}
      />
    ));
  };

  const getStatusBorderColor = () => {
    if (!recording.meeting) return '';

    switch (recording.meeting.status) {
      case 'completed':
        return 'border-t-success';
      case 'in_progress':
        return 'border-t-primary';
      case 'scheduled':
        return 'border-t-muted';
      default:
        return 'border-t-destructive';
    }
  };

  return (
    <Card
      className={`group hover:shadow-md transition-all duration-300 flex flex-col h-full cursor-pointer border-t-4 ${getStatusBorderColor()}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {variant === 'concatenated' && <Badge className="bg-primary text-primary-foreground">拼接录音</Badge>}
              <CardTitle className="text-base font-semibold truncate dark:text-gray-100 flex items-center gap-2">
                {/* Source Icon */}
                {showSource && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-1 -ml-1">
                          {(() => {
                            const SourceIcon = getSourceIcon(recording.source);
                            return <SourceIcon className="w-4 h-4 text-muted-foreground" />;
                          })()}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getSourceLabel(recording.source)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {recording.label || (recording as any).originalFileName || recordingId}
              </CardTitle>
            </div>
            <CardDescription className="mt-1 text-xs dark:text-gray-400">{formatDate(recording.createdAt)}</CardDescription>

          </div>

          <div className="flex items-start gap-1">
            {hasTranscription && (
              <Badge variant="secondary" className="bg-badge-success">
                <CheckCircleIcon className="w-3 h-3 mr-1" />
                已转录
              </Badge>
            )}
            {hasSpeakers && (
              <Badge variant="secondary" className="bg-badge-info">
                <UsersIcon className="w-3 h-3 mr-1" />
                {numSpeakers}人
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1">
        <div className="flex-1 space-y-4">
          {/* Audio Waveform Visualization */}
          <div
            className={`group relative ${variant === 'compact' ? 'h-16' : 'h-20'} bg-gradient-to-r ${
              variant === 'concatenated' ? 'from-primary/5 to-accent/5' : 'from-primary/5 to-primary/5'
            } rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800`}
          >
            <div className="absolute inset-0 flex items-center justify-center gap-1 px-4">{getWaveformBars()}</div>
            <button
              onClick={(e) => toggleAudioPlayback(recordingId, audioUrlFor(recordingId), e)}
              className="absolute inset-0 flex items-center justify-center bg-background/0 hover:bg-background/10 dark:hover:bg-foreground/5 transition-colors opacity-0 group-hover:opacity-100 transition-opacity duration-100"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`${
                        variant === 'compact' ? 'w-12 h-12' : 'w-14 h-14'
                      } bg-background/70 dark:bg-background/70 backdrop-blur-sm rounded-full border border-primary/20 flex items-center justify-center shadow-lg dark:shadow-primary/20 group-hover:scale-105 transition-transform`}
                    >
                      {playingAudio === recordingId ? (
                        <PauseIcon
                          className={`${variant === 'compact' ? 'w-5 h-5' : 'w-6 h-6'} ${
                            variant === 'concatenated' ? 'text-primary dark:text-primary/80' : 'text-primary dark:text-primary/80'
                          }`}
                        />
                      ) : (
                        <PlayIcon
                          className={`${variant === 'compact' ? 'w-5 h-5' : 'w-6 h-6'} ${
                            variant === 'concatenated' ? 'text-primary dark:text-primary/80' : 'text-primary dark:text-primary/80'
                          } ml-1`}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{playingAudio === recordingId ? '暂停播放' : '播放音频'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </button>
          </div>

          {/* Recording Info */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <ClockIcon className="w-3 h-3" />
              <span>{formatDuration(recording.duration || 0)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <FileAudioIcon className="w-3 h-3" />
              <span>{formatFileSize(recording.fileSize || 0)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Volume2Icon className="w-3 h-3" />
              <span>{recording.format || 'WAV'}</span>
            </div>
          </div>

          {/* Transcription Preview */}
          {showTranscriptionPreview && recording.transcription && <TranscriptionPreview transcription={recording.transcription} />}
        </div>


        {/* Action Buttons - Always at bottom */}
        {showActions && (
          <div className="flex gap-2 pt-4 mt-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="flex-1" onClick={handleAction(defaultActions.onView)}>
                    <EyeIcon className="w-3 h-3 mr-1" />
                    {variant === 'compact' ? '查看' : '详情'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{variant === 'compact' ? '查看详情' : '查看录音详情'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {recording.meeting && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/meetings/${recording.meeting?._id}`);
                      }}
                    >
                      <UsersIcon className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>查看关联会议</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {defaultActions.onAssociate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" onClick={handleAction(defaultActions.onAssociate)}>
                      <LinkIcon className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>关联到会议</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={handleAction(defaultActions.onDownload)}>
                    <DownloadIcon className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>下载音频</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {defaultActions.onDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 border-destructive/20"
                      onClick={handleAction(defaultActions.onDelete)}
                    >
                      <TrashIcon className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>删除录音</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecordingCard;
