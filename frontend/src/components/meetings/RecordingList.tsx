import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mic, FileAudio, Volume2 } from 'lucide-react';
import AudioPlayer from '@/components/AudioPlayer';
import { cn } from '@/lib/utils';

import type { Recording } from '@base/types';

interface RecordingListProps {
  recordings: Recording[];
  combinedRecording?: Recording;
  onViewTranscript?: () => void;
  className?: string;
}

function RecordingList({
  recordings,
  combinedRecording,
  onViewTranscript,
  className,
}: RecordingListProps) {
  const [showCombinedRecording, setShowCombinedRecording] = useState(false);

  const recordingsToShow = showCombinedRecording && combinedRecording
    ? [combinedRecording]
    : recordings;

  const hasRecordings = recordings.length > 0 || combinedRecording;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-purple-50/20 to-pink-50/20 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100/30 to-pink-100/30">
              <Mic className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">
                录音文件
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({showCombinedRecording && combinedRecording ? 1 : recordings.length})
                </span>
              </CardTitle>
              <CardDescription>会议相关的音频录制文件</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {combinedRecording && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="recording-mode" className="text-sm font-medium cursor-pointer">
                  合并录音
                </Label>
                <Switch
                  id="recording-mode"
                  checked={showCombinedRecording}
                  onCheckedChange={setShowCombinedRecording}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            )}
            <Button
              onClick={onViewTranscript}
              variant="outline"
              disabled={!hasRecordings}
              className="gap-2 hover:bg-blue-50 hover:text-purple-700 hover:border-purple-300"
            >
              <FileAudio className="w-4 h-4" />
              查看转录
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {recordingsToShow.length > 0 ? (
          <div className="divide-y">
            {recordingsToShow.map((recording, index) => (
              <div
                key={showCombinedRecording ? 'combined' : index}
                className="p-4 hover:bg-gradient-to-r hover:from-purple-50/10 hover:to-pink-50/10 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-50/20 to-pink-50/20">
                      <Volume2 className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {showCombinedRecording ? '合并录音' : recording.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        时长: {recording.duration ? `${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, '0')}` : '未知'}
                      </p>
                    </div>
                  </div>
                  <AudioPlayer recording={recording} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="p-4 rounded-full bg-gradient-to-br from-purple-50/20 to-pink-50/20 mb-4">
              <Mic className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">暂无录音文件</p>
            <p className="text-xs text-muted-foreground mt-1">开始录音以保存会议内容</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecordingList;
