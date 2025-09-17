import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, CheckCircle, AlertCircle, Volume2 } from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';

interface RealTimeSpeechRecognitionProps {
  meetingId: string;
  onRecordingComplete: (recordingData: {
    filename: string;
    downloadUrl: string;
    transcription: string;
    duration: number;
  }) => void;
  isDisabled?: boolean;
}

const RealTimeSpeechRecognition: React.FC<RealTimeSpeechRecognitionProps> = ({
  onRecordingComplete,
  isDisabled = false
}) => {
  const {
    isRecording,
    partialText,
    finalText,
    recordingTime,
    isConnected,
    error,
    startRecording,
    stopRecording
  } = useAudioRecording({
    onRecordingComplete
  });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isDisabled) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <p className="text-gray-500">会议状态不是"进行中"，无法开始录音</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">实时语音识别</h3>
        <div className="flex items-center space-x-2">
          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-red-600">{formatTime(recordingTime)}</span>
            </div>
          )}
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isRecording && !partialText && !finalText}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : isConnected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
          >
            {!isConnected ? '初始化中...' : isRecording ? '停止录音' : '开始录音'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Transcription Display */}
      <div className="space-y-3">
        {partialText && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">实时识别:</span>
            </div>
            <p className="text-blue-900">{partialText}</p>
          </div>
        )}
        
        {finalText && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">最终转录:</span>
            </div>
            <p className="text-green-900 whitespace-pre-wrap">{finalText}</p>
          </div>
        )}
        
        {!partialText && !finalText && !isRecording && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <Mic className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">点击"开始录音"开始实时语音识别</p>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? '已连接到语音识别服务' : '连接断开'}
          </span>
        </div>
        <Badge variant={isRecording ? "destructive" : "secondary"}>
          {isRecording ? "录音中" : "待机"}
        </Badge>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>使用说明:</strong><br/>
          • 确保已允许浏览器访问麦克风<br/>
          • 说话时请保持清晰，避免背景噪音<br/>
          • 录音完成后会自动保存到会议记录中<br/>
          • 支持中文实时语音识别
        </p>
      </div>
    </div>
  );
};

export default RealTimeSpeechRecognition;