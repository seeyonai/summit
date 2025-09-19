import React from 'react';
import PartialTranscriptCard from './PartialTranscriptCard';
import FinalTranscriptCard from './FinalTranscriptCard';
import EmptyState from './EmptyState';
import GroupChatPlaceholder from './GroupChatPlaceholder';
import { EyeOff } from 'lucide-react';

interface TranscriptAreaProps {
  showTranscript: boolean;
  showGroupChat: boolean;
  partialText: string;
  finalText: string;
  themeClasses: {
    transcriptArea: string;
    text: {
      secondary: string;
      muted: string;
    };
  };
  zoomLevel: number;
  pulseAnimation: boolean;
}

const TranscriptArea: React.FC<TranscriptAreaProps> = ({
  showTranscript,
  showGroupChat,
  partialText,
  finalText,
  themeClasses,
  zoomLevel,
  pulseAnimation
}) => {
  if (!showTranscript) {
    return (
      <div className={`flex-1 flex items-center justify-center ${themeClasses.transcriptArea}`}>
        <div className="text-center">
          <EyeOff className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className={`text-xl font-bold ${themeClasses.text.secondary} mb-2`}>
            转录已隐藏
          </h3>
          <p className={themeClasses.text.muted}>
            在设置中启用转录显示以查看内容
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto ${themeClasses.transcriptArea} p-8`}>
      <div 
        className="max-w-5xl mx-auto space-y-6 transition-transform duration-200"
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center top' }}
      >
        {/* Real-time transcription */}
        {partialText && (
          <PartialTranscriptCard 
            partialText={partialText}
            pulseAnimation={pulseAnimation}
          />
        )}

        {/* Final transcription */}
        {finalText && (
          <FinalTranscriptCard 
            finalText={finalText}
          />
        )}

        {/* Empty state */}
        {!partialText && !finalText && (
          <EmptyState />
        )}
        
        {/* Group Chat Placeholder */}
        {showGroupChat && (
          <GroupChatPlaceholder />
        )}
      </div>
    </div>
  );
};

export default TranscriptArea;
