import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Recording } from '@/types';
import {
  FileAudioIcon,
  HashIcon,
  CalendarIcon,
  ClockIcon,
  HardDriveIcon,
  WifiIcon,
  LayersIcon,
  InfoIcon
} from 'lucide-react';

interface RecordingDetailsProps {
  recording: Recording;
}

function RecordingDetails({ recording }: RecordingDetailsProps) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}小时 ${minutes}分钟 ${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  return (
    <div className="space-y-6">
      {/* File Information */}
      <Card>
        <CardHeader>
          <CardTitle>文件信息</CardTitle>
          <CardDescription>录音文件的详细技术参数</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FileAudioIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">文件名</p>
                  <p className="font-medium break-all">{recording.filename}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <HashIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">文件路径</p>
                  <p className="font-medium text-sm break-all">{recording.filePath}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <HardDriveIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">文件大小</p>
                  <p className="font-medium">{formatFileSize(recording.fileSize)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <LayersIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">音频格式</p>
                  <p className="font-medium">{recording.format || 'WAV'}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">创建时间</p>
                  <p className="font-medium">{formatDate(recording.createdAt)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <ClockIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">录音时长</p>
                  <p className="font-medium">{formatDuration(recording.duration)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <WifiIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">采样率</p>
                  <p className="font-medium">
                    {recording.sampleRate ? `${recording.sampleRate.toLocaleString()} Hz` : '-'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">声道数</p>
                  <p className="font-medium">
                    {recording.channels ? `${recording.channels} ${recording.channels === 1 ? '(单声道)' : '(立体声)'}` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      <Card>
        <CardHeader>
          <CardTitle>处理状态</CardTitle>
          <CardDescription>录音文件的各项处理进度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${recording.transcription ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="font-medium">转录状态</span>
              </div>
              <Badge variant={recording.transcription ? 'default' : 'secondary'}>
                {recording.transcription ? '已完成' : '未转录'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${recording.verbatimTranscript ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="font-medium">逐字稿</span>
              </div>
              <Badge variant={recording.verbatimTranscript ? 'default' : 'secondary'}>
                {recording.verbatimTranscript ? '已生成' : '未生成'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${recording.speakerSegments && recording.speakerSegments.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="font-medium">说话人分离</span>
              </div>
              <Badge variant={recording.speakerSegments && recording.speakerSegments.length > 0 ? 'default' : 'secondary'}>
                {recording.speakerSegments && recording.speakerSegments.length > 0 ? `${recording.numSpeakers || new Set(recording.speakerSegments.map(s => s.speakerIndex)).size}人` : '未分析'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${recording.source ? 'bg-blue-500' : 'bg-gray-300'}`} />
                <span className="font-medium">录音来源</span>
              </div>
              <Badge variant="outline">
                {recording.source === 'live' ? '实时录音' : recording.source === 'upload' ? '上传文件' : '未知'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Metadata */}
      {recording.externalId && (
        <Card>
          <CardHeader>
            <CardTitle>扩展信息</CardTitle>
            <CardDescription>其他相关元数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">外部ID</p>
                <p className="font-medium font-mono text-sm">{recording.externalId}</p>
              </div>
              {recording.timeStampedNotes && recording.timeStampedNotes.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">时间戳笔记</p>
                  <div className="space-y-2">
                    {recording.timeStampedNotes.map((note, index) => (
                      <div key={index} className="flex gap-2 text-sm">
                        <Badge variant="outline">{Math.floor(note.timestamp / 60)}:{(note.timestamp % 60).toString().padStart(2, '0')}</Badge>
                        <span>{note.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>技术规格</CardTitle>
          <CardDescription>音频文件的技术细节</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {recording.sampleRate ? Math.round(recording.sampleRate / 1000) : '-'}
              </p>
              <p className="text-xs text-gray-600">kHz 采样率</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {recording.channels || '-'}
              </p>
              <p className="text-xs text-gray-600">声道</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {recording.fileSize ? Math.round((recording.fileSize / recording.duration!) * 8 / 1000) : '-'}
              </p>
              <p className="text-xs text-gray-600">kbps 比特率</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {recording.format || 'WAV'}
              </p>
              <p className="text-xs text-gray-600">格式</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RecordingDetails;
