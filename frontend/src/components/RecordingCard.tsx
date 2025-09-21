import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  FileAudioIcon,
  ClockIcon,
  Volume2Icon,
  EyeIcon,
  LinkIcon,
  CheckCircleIcon,
  UsersIcon,
  TrashIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecordingCardProps {
  recording: Recording;
  variant?: 'default' | 'combined' | 'compact';
  showMeetingInfo?: boolean;
  showTranscriptionPreview?: boolean;
  showActions?: boolean;
  actions?: {
    onView?: (recording: Recording, e?: React.MouseEvent) => void;
    onAssociate?: (recording: Recording, e?: React.MouseEvent) => void;
    onDownload?: (recording: Recording, e?: React.MouseEvent) => void;
    onDelete?: (recording: Recording, e?: React.MouseEvent) => void;
  };
  onClick?: (recording: Recording) => void;
  className?: string;
}

function RecordingCard({
  recording,
  variant = 'default',
  showMeetingInfo = true,
  showTranscriptionPreview = false,
  showActions = true,
  actions = {},
  onClick,
  className = ''
}: RecordingCardProps) {
  const { playingAudio, toggleAudioPlayback } = useAudioPlayback();
  const navigate = useNavigate();
  const recordingId = ('_id' in recording ? recording._id : undefined) || recording.filename;
  const hasTranscription = !!recording.transcription;
  const hasSpeakers = recording.speakerSegments && recording.speakerSegments.length > 0;
  const numSpeakers = recording.numSpeakers || 
    (hasSpeakers ? new Set(recording.speakerSegments?.map(s => s.speakerIndex)).size : 0);

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
    onView: (recording: Recording, e?: React.MouseEvent) => {
      e?.stopPropagation();
      navigate(`/recordings/${('_id' in recording ? recording._id : undefined) || recording.filename}`);
    },
    onDownload: (recording: Recording, e?: React.MouseEvent) => {
      e?.stopPropagation();
      window.open(audioUrlFor(recording.filename), '_blank');
    },
    ...actions
  };

  const getCardClassName = () => {
    let baseClasses = 'overflow-hidden transition-all duration-300 hover:shadow-lg';
    
    if (onClick) {
      baseClasses += ' cursor-pointer';
    }
    
    switch (variant) {
      case 'combined':
        return `${baseClasses} border-purple-200 bg-gradient-to-br from-purple-50/20 to-indigo-50/20 ${className}`;
      case 'compact':
        return `${baseClasses} border-gray-200 hover:border-blue-300 ${className}`;
      default:
        return `${baseClasses} border-gray-200 hover:border-blue-300 ${className}`;
    }
  };

  const getWaveformBars = () => {
    const barCount = variant === 'compact' ? 25 : 40;
    const colorClasses = variant === 'combined' 
      ? 'from-indigo-400/30 to-purple-400/30'
      : 'from-blue-400/60 to-indigo-400/60';
    
    return Array.from({ length: barCount }).map((_, i) => (
      <div
        key={i}
        className={`flex-1 bg-gradient-to-t ${colorClasses} rounded-full opacity-40`}
        style={{
          height: `${Math.random() * 100}%`,
          animationDelay: `${i * 0.05}s`
        }}
      />
    ));
  };

  return (
    <Card className={`${getCardClassName()} flex flex-col h-full`} onClick={handleCardClick}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {variant === 'combined' && (
                <Badge className="bg-purple-600 text-white">
                  合并录音
                </Badge>
              )}
              <CardTitle className="text-base font-semibold truncate">
                {recording.filename}
              </CardTitle>
            </div>
            <CardDescription className="mt-1 text-xs">
              {formatDate(recording.createdAt)}
            </CardDescription>
            
            {/* Meeting Information */}
            {showMeetingInfo && recording.meeting && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">会议:</span>
                <span className="text-xs font-medium text-gray-700 truncate">
                  {recording.meeting.title}
                </span>
                <Badge 
                  variant="outline"
                  className={
                    recording.meeting.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                    recording.meeting.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    recording.meeting.status === 'scheduled' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }
                >
                  {recording.meeting.status === 'completed' ? '已完成' :
                   recording.meeting.status === 'in_progress' ? '进行中' :
                   recording.meeting.status === 'scheduled' ? '已安排' : '失败'}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex gap-1">
            {hasTranscription && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <CheckCircleIcon className="w-3 h-3 mr-1" />
                已转录
              </Badge>
            )}
            {hasSpeakers && (
              <Badge variant="secondary" className={variant === 'combined' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
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
          <div className={`relative ${variant === 'compact' ? 'h-16' : 'h-20'} bg-gradient-to-r ${
            variant === 'combined' 
              ? 'from-indigo-50/30 to-purple-50/30' 
              : 'from-blue-50/30 to-indigo-50/30'
          } rounded-lg overflow-hidden`}>
            <div className="absolute inset-0 flex items-center justify-center gap-1 px-4">
              {getWaveformBars()}
            </div>
            <button
              onClick={(e) => toggleAudioPlayback(recordingId, audioUrlFor(recording.filename), e)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors"
            >
              <div className={`${variant === 'compact' ? 'w-12 h-12' : 'w-14 h-14'} bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow`}>
                {playingAudio === recordingId ? (
                  <PauseIcon className={`${variant === 'compact' ? 'w-5 h-5' : 'w-6 h-6'} ${variant === 'combined' ? 'text-indigo-600' : 'text-blue-600'}`} />
                ) : (
                  <PlayIcon className={`${variant === 'compact' ? 'w-5 h-5' : 'w-6 h-6'} ${variant === 'combined' ? 'text-indigo-600' : 'text-blue-600'} ml-1`} />
                )}
              </div>
            </button>
          </div>

          {/* Recording Info */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1 text-gray-600">
              <ClockIcon className="w-3 h-3" />
              <span>{formatDuration(recording.duration || 0)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <FileAudioIcon className="w-3 h-3" />
              <span>{formatFileSize(recording.fileSize || 0)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Volume2Icon className="w-3 h-3" />
              <span>{recording.format || 'WAV'}</span>
            </div>
          </div>

          {/* Transcription Preview */}
          {showTranscriptionPreview && recording.transcription && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-700 line-clamp-2">
                {recording.transcription}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons - Always at bottom */}
        {showActions && (
          <div className="flex gap-2 pt-4 mt-auto">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleAction(defaultActions.onView)}
            >
              <EyeIcon className="w-3 h-3 mr-1" />
              {variant === 'compact' ? '查看' : '详情'}
            </Button>
            
            {defaultActions.onAssociate && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAction(defaultActions.onAssociate)}
              >
                <LinkIcon className="w-3 h-3" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleAction(defaultActions.onDownload)}
            >
              <DownloadIcon className="w-3 h-3" />
            </Button>
            
            {defaultActions.onDelete && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleAction(defaultActions.onDelete)}
              >
                <TrashIcon className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecordingCard;
