import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2 } from 'lucide-react';

interface PartialTranscriptCardProps {
  partialText: string;
  pulseAnimation: boolean;
}

const PartialTranscriptCard: React.FC<PartialTranscriptCardProps> = ({
  partialText,
  pulseAnimation
}) => {
  return (
    <div className={`transform transition-all duration-300 ${
      pulseAnimation ? 'scale-[1.01]' : 'scale-100'
    }`}>
      <Card className="bg-gradient-to-r from-blue-900/10 to-blue-900/10 border-blue-500/20 backdrop-blur-sm shadow-xl shadow-blue-500/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Volume2 className="w-5 h-5 text-blue-400" />
              <div className="absolute -inset-1 bg-blue-400 rounded-full blur-md opacity-20 animate-pulse"></div>
            </div>
            <span className="text-sm font-semibold text-blue-300 uppercase tracking-wider">
              实时识别中
            </span>
            <div className="flex gap-1 ml-auto">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
          <p className="text-blue-50 text-lg leading-relaxed font-medium">
            {partialText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartialTranscriptCard;
