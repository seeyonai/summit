import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Meeting, Recording } from '@/types';
import { apiUrl } from '@/services/api';
import {
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  FileAudioIcon,
  ClockIcon,
  MicIcon,
  Volume2Icon,
  EyeIcon,
  LinkIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  UsersIcon
} from 'lucide-react';

interface MeetingRecordingsProps {
  meeting: Meeting;
  onViewTranscript: () => void;
}

const audioUrlFor = (filename: string) => apiUrl(`/recordings/${filename}`);

function MeetingRecordings({ meeting, onViewTranscript }: MeetingRecordingsProps) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioRefs, setAudioRefs] = useState<{ [key: string]: HTMLAudioElement }>({});

  const recordings = meeting.recordings || [];
  const combinedRecording = meeting.combinedRecording;

  const toggleAudioPlayback = (recordingId: string, audioUrl: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (playingAudio === recordingId) {
      audioRefs[recordingId]?.pause();
      setPlayingAudio(null);
    } else {
      // Pause any currently playing audio
      if (playingAudio && audioRefs[playingAudio]) {
        audioRefs[playingAudio].pause();
      }
      
      // Create or get audio element
      if (!audioRefs[recordingId]) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingAudio(null);
        setAudioRefs(prev => ({ ...prev, [recordingId]: audio }));
        audio.play();
      } else {
        audioRefs[recordingId].play();
      }
      
      setPlayingAudio(recordingId);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return '-';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('zh-CN');
  };

  const RecordingCard = ({ recording, isCombined = false }: { recording: Recording; isCombined?: boolean }) => {
    const hasTranscription = !!recording.transcription;
    const hasSpeakers = recording.speakerSegments && recording.speakerSegments.length > 0;
    const numSpeakers = recording.numSpeakers || 
      (hasSpeakers ? new Set(recording.speakerSegments?.map(s => s.speakerIndex)).size : 0);

    return (
      <Card className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${
        isCombined ? 'border-purple-200 bg-gradient-to-br from-purple-50/20 to-indigo-50/20' : 'border-gray-200'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isCombined && (
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
            </div>
            <div className="flex gap-1">
              {hasTranscription && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  已转录
                </Badge>
              )}
              {hasSpeakers && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  <UsersIcon className="w-3 h-3 mr-1" />
                  {numSpeakers}人
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Audio Waveform Visualization */}
          <div className="relative h-20 bg-gradient-to-r from-indigo-50/30 to-purple-50/30 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center gap-1 px-4">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-indigo-400/30 to-purple-400/30 rounded-full opacity-40 animate-pulse"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              ))}
            </div>
            <button
              onClick={(e) => toggleAudioPlayback(
                recording._id || recording.filename,
                audioUrlFor(recording.filename),
                e
              )}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors"
            >
              <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                {playingAudio === (recording._id || recording.filename) ? (
                  <PauseIcon className="w-6 h-6 text-indigo-600" />
                ) : (
                  <PlayIcon className="w-6 h-6 text-indigo-600 ml-1" />
                )}
              </div>
            </button>
          </div>

          {/* Recording Info */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1 text-gray-600">
              <ClockIcon className="w-3 h-3" />
              <span>{formatDuration(recording.duration)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <FileAudioIcon className="w-3 h-3" />
              <span>{formatFileSize(recording.fileSize)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Volume2Icon className="w-3 h-3" />
              <span>{recording.format || 'WAV'}</span>
            </div>
          </div>

          {/* Transcription Preview */}
          {hasTranscription && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1 font-medium">转录预览</p>
              <p className="text-xs text-gray-700 line-clamp-2">
                {recording.transcription}
              </p>
            </div>
          )}

          {/* Speaker Timeline */}
          {hasSpeakers && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">发言人时间线</p>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
                {recording.speakerSegments?.map((segment, idx) => {
                  const left = (segment.startTime / (recording.duration || 1)) * 100;
                  const width = ((segment.endTime - segment.startTime) / (recording.duration || 1)) * 100;
                  const colors = [
                    'bg-blue-500',
                    'bg-green-500',
                    'bg-yellow-500',
                    'bg-purple-500',
                    'bg-pink-500'
                  ];
                  return (
                    <div
                      key={idx}
                      className={`absolute h-full ${colors[segment.speakerIndex % colors.length]}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/recordings/${recording._id || recording.filename}`, '_blank');
              }}
            >
              <EyeIcon className="w-3 h-3 mr-1" />
              详情
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                window.open(audioUrlFor(recording.filename), '_blank');
              }}
            >
              <DownloadIcon className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">录音总数</p>
                <p className="text-2xl font-bold">{recordings.length}</p>
              </div>
              <MicIcon className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总时长</p>
                <p className="text-2xl font-bold">
                  {formatDuration(recordings.reduce((acc, r) => acc + (r.duration || 0), 0))}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已转录</p>
                <p className="text-2xl font-bold">
                  {recordings.filter(r => r.transcription).length}
                </p>
              </div>
              <FileAudioIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">合并状态</p>
                <p className="text-2xl font-bold">
                  {combinedRecording ? '已合并' : '未合并'}
                </p>
              </div>
              <LinkIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Recording */}
      {combinedRecording && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">合并录音</h3>
            <Button onClick={onViewTranscript} variant="outline" size="sm">
              <EyeIcon className="w-4 h-4 mr-2" />
              查看完整转录
            </Button>
          </div>
          <RecordingCard recording={combinedRecording} isCombined={true} />
        </div>
      )}

      {/* Individual Recordings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">独立录音文件</h3>
        {recordings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recordings.map((recording) => (
              <RecordingCard 
                key={recording._id || recording.filename} 
                recording={recording} 
              />
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <MicIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">暂无录音</p>
              <p className="text-sm text-gray-400">
                会议进行中可以开始录音
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default MeetingRecordings;
