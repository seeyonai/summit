import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Wifi, 
  WifiOff, 
  ZoomIn, 
  ZoomOut,
  Settings,
  Fullscreen,
  Minimize2,
  FileText,
  FileX
} from 'lucide-react';

interface MeetingHeaderProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  isConnected: boolean;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onEnterMinimal: () => void;
  onOpenSettings: () => void;
  onExitFullscreen: () => void;
  onToggleTranscript: () => void;
  showTranscript: boolean;
  title: string;
  darkModeTextClasses: string;
  themeClasses: {
    header: string;
    text: {
      primary: string;
      secondary: string;
    };
  };
}

const MeetingHeader: React.FC<MeetingHeaderProps> = ({
  isRecording,
  isPaused,
  recordingTime,
  isConnected,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onEnterMinimal,
  onOpenSettings,
  onExitFullscreen,
  onToggleTranscript,
  showTranscript,
  title,
  darkModeTextClasses,
  themeClasses
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

  return (
    <div className={`${themeClasses.header} backdrop-blur-lg border-b shadow-2xl`}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Recording Status */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-4 h-4 rounded-full ${
                  isRecording && !isPaused ? 'bg-red-500' : 
                  isPaused ? 'bg-yellow-500' : 
                  'bg-gray-500'
                }`}>
                  {isRecording && !isPaused && (
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping"></div>
                  )}
                </div>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${themeClasses.text.primary}`}>
                  {title || '会议进行中'}
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <Badge 
                    variant={isRecording ? "destructive" : "secondary"} 
                    className="text-xs font-medium"
                  >
                    {isRecording ? (isPaused ? "已暂停" : "录音中") : "待机"}
                  </Badge>
                  <div className={`flex items-center gap-1.5 text-sm ${themeClasses.text.secondary}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono">{formatTime(recordingTime)}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="h-10 bg-slate-700" />

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                isConnected 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-500">连接正常</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-500">连接断开</span>
                  </>
                )}
              </div>
            </div>

            <Separator orientation="vertical" className="h-10 bg-slate-700" />

            {/* Transcript Toggle */}
            <div className="flex items-center gap-2">
              <Button
                onClick={onToggleTranscript}
                variant="ghost"
                size="sm"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                  showTranscript 
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20' 
                    : 'bg-slate-800/50 border border-slate-600/30 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                {showTranscript ? (
                  <FileText className="w-4 h-4" />
                ) : (
                  <FileX className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {showTranscript ? '显示实时转录' : '隐藏实时转录'}
                </span>
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
              <Button
                onClick={onZoomOut}
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors h-8 w-8 p-0"
                disabled={zoomLevel <= 50}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                onClick={onResetZoom}
                variant="ghost"
                size="sm"
                className={`${themeClasses.text.secondary} hover:${themeClasses.text.primary} hover:bg-opacity-10 hover:bg-gray-500 transition-colors px-2 h-8 text-xs font-mono`}
              >
                {zoomLevel}%
              </Button>
              <Button
                onClick={onZoomIn}
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors h-8 w-8 p-0"
                disabled={zoomLevel >= 200}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Minimal Mode Toggle */}
            <Button
              onClick={onEnterMinimal}
              variant="ghost"
              size="icon"
              className={`${themeClasses.text.secondary} hover:${themeClasses.text.primary} hover:bg-opacity-10 hover:bg-gray-500 transition-colors`}
              title="进入专注模式"
            >
              <Minimize2 className="w-5 h-5" />
            </Button>
            
            {/* Settings Button */}
            <Button
              onClick={onOpenSettings}
              variant="ghost"
              size="icon"
              className={`${themeClasses.text.secondary} hover:${themeClasses.text.primary} hover:bg-opacity-10 hover:bg-gray-500 transition-colors`}
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            <Button
              onClick={onExitFullscreen}
              variant="ghost"
              size="icon"
              className={`${themeClasses.text.secondary} hover:${themeClasses.text.primary} hover:bg-opacity-10 hover:bg-gray-500 transition-colors`}
            >
              <Fullscreen className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingHeader;
