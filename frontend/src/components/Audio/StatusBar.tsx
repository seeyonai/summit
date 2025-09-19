import React from 'react';
import { Separator } from '@/components/ui/separator';

interface StatusBarProps {
  isConnected: boolean;
  themeClasses: {
    statusBar: string;
    text: {
      secondary: string;
      muted: string;
    };
  };
}

const StatusBar: React.FC<StatusBarProps> = ({
  isConnected,
  themeClasses
}) => {
  return (
    <div className={`${themeClasses.statusBar} backdrop-blur-sm border-t px-8 py-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full"></div>
            <span className={`${themeClasses.text.secondary} font-medium`}>Summit AI</span>
          </div>
          <Separator orientation="vertical" className="h-4 bg-slate-700" />
          <span className={themeClasses.text.muted}>实时会议转录系统</span>
          <Separator orientation="vertical" className="h-4 bg-slate-700" />
          <span className={themeClasses.text.muted}>支持中英文识别</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            isConnected 
              ? 'bg-emerald-500/10 border border-emerald-500/30' 
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-red-500'
            }`}></div>
            <span className={`text-xs font-medium ${
              isConnected ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {isConnected ? '服务正常' : '服务异常'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
