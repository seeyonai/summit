import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Maximize2, Clock, Mic, Wifi, WifiOff, Volume2, CheckCircle } from 'lucide-react';

interface MeetingDisplayProps {
  isVisible: boolean;
  isRecording: boolean;
  partialText: string;
  finalText: string;
  recordingTime: number;
  isConnected: boolean;
  onStopRecording: () => void;
  onExitFullscreen: () => void;
  initialTitle: string;
  initialAgenda: string;
}

const MeetingDisplay: React.FC<MeetingDisplayProps> = ({
  isVisible,
  isRecording,
  partialText,
  finalText,
  recordingTime,
  isConnected,
  onStopRecording,
  onExitFullscreen,
  initialTitle,
  initialAgenda
}) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-lg font-semibold">{initialTitle || '会议进行中'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>{formatTime(recordingTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">已连接</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">连接断开</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isRecording ? "destructive" : "secondary"} className="text-sm">
              {isRecording ? "录音中" : "待机"}
            </Badge>
            <Button
              onClick={onExitFullscreen}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Left Panel - Meeting Info */}
          <div className="w-80 bg-gray-800 text-white p-6 border-r border-gray-700">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">会议信息</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">标题:</span>
                    <p className="text-white mt-1">{initialTitle || '未设置标题'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">议程:</span>
                    <p className="text-white mt-1">{initialAgenda || '未设置议程'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">控制</h3>
                <div className="space-y-2">
                  <Button
                    onClick={onStopRecording}
                    disabled={!isRecording}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    停止录音
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">统计</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">录音时长:</span>
                    <span className="text-white">{formatTime(recordingTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">转录字数:</span>
                    <span className="text-white">{finalText.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Transcription */}
          <div className="flex-1 bg-gray-900 p-6 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Real-time transcription */}
                {partialText && (
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">实时识别</span>
                    </div>
                    <p className="text-blue-100 text-lg leading-relaxed">{partialText}</p>
                  </div>
                )}

                {/* Final transcription */}
                {finalText && (
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-green-400">最终转录</span>
                    </div>
                    <p className="text-green-100 text-lg leading-relaxed whitespace-pre-wrap">{finalText}</p>
                  </div>
                )}

                {/* Empty state */}
                {!partialText && !finalText && (
                  <div className="text-center py-12">
                    <Mic className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">等待语音输入...</p>
                    <p className="text-gray-500 text-sm mt-2">开始说话后将显示实时转录内容</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status bar */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center gap-4">
                  <span>Summit AI 实时会议系统</span>
                  <span>•</span>
                  <span>支持中文语音识别</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>{isConnected ? '服务正常' : '服务异常'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDisplay;