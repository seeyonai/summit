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
      <Card className="bg-gradient-to-r from-primary/10 to-primary/10 border-primary/20 backdrop-blur-sm shadow-xl shadow-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Volume2 className="w-5 h-5 text-primary-400" />
              <div className="absolute -inset-1 bg-primary rounded-full blur-md opacity-20 animate-pulse"></div>
            </div>
            <span className="text-sm font-semibold text-primary-300 uppercase tracking-wider">
              实时识别中
            </span>
            <div className="flex gap-1 ml-auto">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
          <p className="text-primary-50 text-lg leading-relaxed font-medium">
            {partialText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartialTranscriptCard;
