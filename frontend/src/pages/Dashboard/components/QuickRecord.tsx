import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, CheckCircle } from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { formatDuration } from '@/utils/formatHelpers';

interface QuickRecordProps {
  onRecordingComplete?: (filename: string) => void;
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
      onRecordingComplete?.(data.filename);
    }
  });

  return (
    <Card className="card-hover border-l-4 border-l-red-500 dark:border-l-red-600">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isRecording ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
              <Mic className={`w-5 h-5 ${isRecording ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">快速录音</CardTitle>
              <CardDescription className="text-sm">
                快速开始录音，无需关联会议
              </CardDescription>
            </div>
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/20 rounded-full">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-red-700 dark:text-red-400">录音中</span>
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
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        
        {partialText && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">实时转录</span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-300">{partialText}</p>
          </div>
        )}
        
        {finalText && (
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">录音完成</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">{formatDuration(recordingTime)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickRecord;