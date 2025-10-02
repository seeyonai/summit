import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, CheckCircle } from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { formatDuration } from '@/utils/formatHelpers';

interface QuickRecordProps {
  onRecordingComplete?: (downloadUrl: string) => void;
}

const QuickRecord: React.FC<QuickRecordProps> = ({ onRecordingComplete }) => {
  const {
    isRecording,
    partialText,
    finalText,
    error,
    startRecording,
    stopRecording,
    recordingTime
  } = useAudioRecording({
    onRecordingComplete: (data) => {
      onRecordingComplete?.(data.downloadUrl);
    }
  });

  return (
    <Card className="card-hover border-l-4 border-l-destructive">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isRecording ? 'bg-destructive/10' : 'bg-primary/10'}`}>
              <Mic className={`w-5 h-5 ${isRecording ? 'text-destructive' : 'text-primary'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">快速录音</CardTitle>
              <CardDescription className="text-sm">
                快速开始录音，无需关联会议
              </CardDescription>
            </div>
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 rounded-full">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-destructive">录音中</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            onClick={startRecording}
            disabled={isRecording}
            size="lg"
            className="flex-1 transition-all duration-300 hover:shadow-lg"
          >
            {isRecording ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                录音中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                开始录音
              </div>
            )}
          </Button>
          <Button
            onClick={stopRecording}
            disabled={!isRecording}
            variant="destructive"
            size="lg"
            className="transition-all duration-300 hover:shadow-lg"
          >
            停止
          </Button>
        </div>
        
        {error && (
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        {partialText && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-xs font-medium text-primary">实时转录</span>
            </div>
            <p className="text-sm text-foreground">{partialText}</p>
          </div>
        )}
        
        {finalText && (
          <div className="p-4 bg-success/5 border border-success/20 rounded-lg animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">录音完成</span>
            </div>
            <p className="text-xs text-success">{formatDuration(recordingTime)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickRecord;
