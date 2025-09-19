import React from 'react';
import { Mic } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="relative inline-block">
          <Mic className="w-20 h-20 text-slate-600 mx-auto mb-6" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-slate-700/20 rounded-full animate-ping"></div>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-slate-300 mb-2">
          等待语音输入
        </h3>
        <p className="text-slate-500 max-w-md mx-auto">
          开始说话后将显示实时转录内容，AI 将智能识别并记录您的会议内容
        </p>
      </div>
    </div>
  );
};

export default EmptyState;
