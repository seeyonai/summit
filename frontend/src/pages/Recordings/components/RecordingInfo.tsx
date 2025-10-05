import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Recording } from '@/types';
import {
  FileAudioIcon,
  CalendarIcon,
  ClockIcon,
  HardDriveIcon,
  WifiIcon,
  LayersIcon,
  InfoIcon,
  ZapIcon,
  MusicIcon,
  Disc3Icon,
  MicIcon
} from 'lucide-react';

interface RecordingInfoProps {
  recording: Recording;
}

function RecordingInfo({ recording }: RecordingInfoProps) {
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
                <FileAudioIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">文件名</p>
                  <p className="font-medium break-all">{(recording as any).originalFileName || `${recording._id}.${recording.format || 'wav'}`}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <HardDriveIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">文件大小</p>
                  <p className="font-medium">{formatFileSize(recording.fileSize)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <LayersIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">音频格式</p>
                  <p className="font-medium">{recording.format || 'WAV'}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">创建时间</p>
                  <p className="font-medium">{formatDate(recording.createdAt)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <ClockIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">录音时长</p>
                  <p className="font-medium">{formatDuration(recording.duration)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <WifiIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">采样率</p>
                  <p className="font-medium">
                    {recording.sampleRate ? `${recording.sampleRate.toLocaleString()} Hz` : '-'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">声道数</p>
                  <p className="font-medium">
                    {recording.channels ? `${recording.channels} ${recording.channels === 1 ? '(单声道)' : '(立体声)'}` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Metadata from music-metadata */}
      {recording.metadata && (
        <Card>
          <CardHeader>
            <CardTitle>音频元数据</CardTitle>
            <CardDescription>从音频文件中提取的详细信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Technical Audio Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <ZapIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">比特率</p>
                      <p className="font-medium">
                        {recording.metadata.bitrate ? `${recording.metadata.bitrate} kbps` : '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Disc3Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">容器格式</p>
                      <p className="font-medium">
                        {recording.metadata.container || '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <LayersIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">编码器</p>
                      <p className="font-medium">
                        {recording.metadata.codec || '-'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Common ID3 Metadata */}
                  {recording.metadata.title && (
                    <div className="flex items-start gap-3">
                      <MusicIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">标题</p>
                        <p className="font-medium">{recording.metadata.title}</p>
                      </div>
                    </div>
                  )}
                  
                  {recording.metadata.artist && (
                    <div className="flex items-start gap-3">
                      <MicIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">艺术家</p>
                        <p className="font-medium">{recording.metadata.artist}</p>
                      </div>
                    </div>
                  )}
                  
                  {recording.metadata.album && (
                    <div className="flex items-start gap-3">
                      <Disc3Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">专辑</p>
                        <p className="font-medium">{recording.metadata.album}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Additional Metadata Tags */}
              <div className="flex flex-wrap gap-2">
                {recording.metadata.year && (
                  <Badge variant="outline">
                    {recording.metadata.year}年
                  </Badge>
                )}
                {recording.metadata.genre && (
                  <Badge variant="outline">
                    {Array.isArray(recording.metadata.genre) ? recording.metadata.genre.join(', ') : recording.metadata.genre}
                  </Badge>
                )}
                {recording.metadata.comment && (
                  <Badge variant="secondary">
                    备注: {recording.metadata.comment}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Metadata */}
      {recording.timeStampedNotes && recording.timeStampedNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>扩展信息</CardTitle>
            <CardDescription>其他相关元数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">时间戳笔记</p>
                <div className="space-y-2">
                  {recording.timeStampedNotes.map((note, index) => (
                    <div key={index} className="flex gap-2 text-sm">
                      <Badge variant="outline">{Math.floor(note.timestamp / 60)}:{(note.timestamp % 60).toString().padStart(2, '0')}</Badge>
                      <span>{note.text}</span>
                    </div>
                  ))}
                </div>
              </div>
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
            <div className="text-center p-4 bg-card rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                {recording.metadata?.sampleRate ? Math.round(recording.metadata.sampleRate / 1000) : recording.sampleRate ? Math.round(recording.sampleRate / 1000) : '-'}
              </p>
              <p className="text-xs text-muted-foreground">kHz 采样率</p>
            </div>
            
            <div className="text-center p-4 bg-card rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                {recording.metadata?.channels || recording.channels || '-'}
              </p>
              <p className="text-xs text-muted-foreground">声道</p>
            </div>
            
            <div className="text-center p-4 bg-card rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                {recording.metadata?.bitrate || (recording.fileSize && recording.duration ? Math.round((recording.fileSize / recording.duration) * 8 / 1000) : '-')}
              </p>
              <p className="text-xs text-muted-foreground">kbps 比特率</p>
            </div>
            
            <div className="text-center p-4 bg-card rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                {recording.metadata?.duration ? Math.round(recording.metadata.duration) : recording.duration || '-'}
              </p>
              <p className="text-xs text-muted-foreground">秒时长</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RecordingInfo;
