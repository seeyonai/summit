import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon
} from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  showAgenda: boolean;
  onToggleAgenda: (show: boolean) => void;
  showTranscript: boolean;
  onToggleTranscript: (show: boolean) => void;
  showGroupChat: boolean;
  onToggleGroupChat: (show: boolean) => void;
  isMinimalMode: boolean;
  onToggleMinimalMode: (minimal: boolean) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  themeClasses: {
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
  };
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  isDarkMode,
  onToggleTheme,
  showAgenda,
  onToggleAgenda,
  showTranscript,
  onToggleTranscript,
  showGroupChat,
  onToggleGroupChat,
  isMinimalMode,
  onToggleMinimalMode,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  themeClasses
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700/50 max-w-md backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            显示设置
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="agenda-toggle" className="text-sm font-medium text-white">
                显示议程
              </Label>
              <p className="text-xs text-slate-400">
                在左侧面板中显示会议议程信息
              </p>
            </div>
            <Switch
              id="agenda-toggle"
              checked={showAgenda}
              onCheckedChange={onToggleAgenda}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="transcript-toggle" className="text-sm font-medium text-white">
                显示实时转录
              </Label>
              <p className="text-xs text-slate-400">
                在主面板中显示语音转录内容
              </p>
            </div>
            <Switch
              id="transcript-toggle"
              checked={showTranscript}
              onCheckedChange={onToggleTranscript}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="chat-toggle" className="text-sm font-medium text-white">
                显示群聊
              </Label>
              <p className="text-xs text-slate-400">
                显示群聊消息面板（开发中）
              </p>
            </div>
            <Switch
              id="chat-toggle"
              checked={showGroupChat}
              onCheckedChange={onToggleGroupChat}
              disabled={!showTranscript}
            />
          </div>
          
          <Separator className="bg-slate-700" />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="theme-toggle" className={`text-sm font-medium ${themeClasses.text.primary}`}>
                深色模式
              </Label>
              <p className={`text-xs ${themeClasses.text.muted}`}>
                切换页面主题颜色
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sun className={`w-4 h-4 ${!isDarkMode ? 'text-yellow-500' : themeClasses.text.muted}`} />
              <Switch
                id="theme-toggle"
                checked={isDarkMode}
                onCheckedChange={onToggleTheme}
              />
              <Moon className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : themeClasses.text.muted}`} />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="minimal-toggle" className={`text-sm font-medium ${themeClasses.text.primary}`}>
                专注模式
              </Label>
              <p className={`text-xs ${themeClasses.text.muted}`}>
                隐藏头部、侧边栏和底部状态栏
              </p>
            </div>
            <Switch
              id="minimal-toggle"
              checked={isMinimalMode}
              onCheckedChange={onToggleMinimalMode}
            />
          </div>
          
          <Separator className="bg-slate-700" />
          
          <div className="space-y-3">
            <Label className={`text-sm font-medium ${themeClasses.text.primary}`}>
              页面缩放
            </Label>
            <div className="flex items-center justify-between">
              <Button
                onClick={onZoomOut}
                variant="outline"
                size="sm"
                className={`${isDarkMode ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-gray-200 border-gray-300 text-gray-900 hover:bg-gray-300'}`}
                disabled={zoomLevel <= 50}
              >
                <ZoomOut className="w-4 h-4 mr-1" />
                缩小
              </Button>
              <span className={`${themeClasses.text.primary} font-mono text-sm px-3 py-1 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} rounded`}>
                {zoomLevel}%
              </span>
              <Button
                onClick={onZoomIn}
                variant="outline"
                size="sm"
                className={`${isDarkMode ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-gray-200 border-gray-300 text-gray-900 hover:bg-gray-300'}`}
                disabled={zoomLevel >= 200}
              >
                <ZoomIn className="w-4 h-4 mr-1" />
                放大
              </Button>
            </div>
            <Button
              onClick={onResetZoom}
              variant="ghost"
              size="sm"
              className={`w-full ${themeClasses.text.secondary} hover:${themeClasses.text.primary} ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
            >
              重置缩放
            </Button>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button 
            onClick={() => onOpenChange(false)}
            className={`${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
          >
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
