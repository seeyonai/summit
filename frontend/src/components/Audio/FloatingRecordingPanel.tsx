import React from 'react';
import { recordingPanelBus } from '@/services/recordingPanelBus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Minus, 
  Maximize2, 
  X, 
  Volume2, 
  Clock,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Monitor,
  MonitorOff
} from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useRecordingPanel } from '@/contexts/RecordingPanelContext';

interface FloatingRecordingPanelProps {
  isVisible: boolean;
}

function FloatingRecordingPanel({ isVisible }: FloatingRecordingPanelProps) {
  const {
    minimizePanel,
    closePanel,
    maximizePanel,
    isMinimized,
    isFullscreen,
    toggleFullscreen
  } = useRecordingPanel();
  // Internal recorder state using the live WS endpoint
  const {
    isRecording,
    partialText,
    finalText,
    recordingTime,
    isConnected,
    startRecording,
    stopRecording
  } = useAudioRecording({ });
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const panelRef = React.useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    
    setIsDragging(true);
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || isMinimized) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  }, [isDragging, dragOffset, isMinimized]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isVisible) return null;

  if (isMinimized) {
    return (
      <div
        ref={panelRef}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg shadow-lg p-2 cursor-move border border-white/80"
        style={{ 
          transform: 'translate(0, 0)',
          transition: isDragging ? 'none' : 'all 0.3s ease',
          background: 'linear-gradient(135deg, #1f1f1f 0%, #242424 100%)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
        }}
        onMouseDown={handleMouseDown}
      >
        <Button
          size="sm"
          variant="ghost"
          onClick={maximizePanel}
          className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-2 px-2 py-1 min-w-[200px]">
          {isRecording ? (
            <>
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white">录音中</span>
              <span className="text-xs text-white/60">{formatTime(recordingTime)}</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/80">录音控制面板</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <Button size="sm" variant="ghost" onClick={startRecording} disabled={isRecording} className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10">
            <Mic className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { stopRecording(); recordingPanelBus.stop(); }} disabled={!isRecording} className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-80 shadow-2xl border-2 border-white/80 rounded-lg overflow-hidden transition-all duration-300"
      style={{ 
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: 'translate(0, 0)',
        transition: isDragging ? 'none' : 'all 0.3s ease',
        background: 'linear-gradient(135deg, #1f1f1f 0%, #242424 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
      }}
      onMouseDown={handleMouseDown}
    >
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isRecording ? 'bg-red-500/20 border border-red-500/50' : 'bg-blue-500/20 border border-blue-500/50'}`}>
                <Mic className={`w-4 h-4 ${isRecording ? 'text-red-400' : 'text-blue-400'}`} />
              </div>
              <CardTitle className="text-sm font-medium text-white">录音控制面板</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
                className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/10"
                title={isFullscreen ? "退出大屏模式" : "开始实时大屏模式"}
              >
                {isFullscreen ? <MonitorOff className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={minimizePanel}
                className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/10"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={closePanel}
                className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">已连接</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">未连接</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-white/60" />
                <span className="text-white/80">{formatTime(recordingTime)}</span>
              </div>
            </div>
            <Badge variant={isRecording ? "destructive" : "secondary"} className={`text-xs font-bold ${isRecording ? 'bg-red-500 text-white' : 'bg-gray-600 text-white'}`}>
              {isRecording ? "录音中" : "待机"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-0">
          <div className="flex gap-2">
            <Button onClick={startRecording} disabled={isRecording} size="sm" className={`flex-1 font-bold ${isRecording ? 'bg-gray-600 text-white' : 'bg-blue-500 hover:bg-blue-400 text-white'}`}>
              {isRecording ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  录音中
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  开始录音
                </div>
              )}
            </Button>
            <Button
              onClick={() => { stopRecording(); recordingPanelBus.stop(); }}
              disabled={!isRecording}
              variant="destructive"
              size="sm"
              className="bg-red-500 hover:bg-red-400 text-white font-bold"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          {partialText && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-1 mb-1">
                <Volume2 className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-bold text-blue-400">实时转录</span>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">{partialText}</p>
            </div>
          )}
          
          {finalText && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg max-h-32 overflow-y-auto backdrop-blur-sm">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs font-bold text-green-400">最终结果</span>
              </div>
              <p className="text-xs text-green-100 leading-relaxed whitespace-pre-wrap">{finalText}</p>
            </div>
          )}
          
          {!isConnected && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-xs font-bold text-red-400">连接断开</span>
              </div>
              <p className="text-xs text-red-200 mt-1">请检查网络连接并重试</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FloatingRecordingPanel;
