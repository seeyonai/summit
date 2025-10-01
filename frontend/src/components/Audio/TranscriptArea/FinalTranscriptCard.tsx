import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface FinalTranscriptCardProps {
  finalText: string;
}

const FinalTranscriptCard: React.FC<FinalTranscriptCardProps> = ({
  finalText
}) => {
  return (
    <Card className="bg-gradient-to-r from-success/10 to-success/10 border-success/20 backdrop-blur-sm shadow-xl shadow-success/5">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <CheckCircle className="w-5 h-5 text-success-400" />
          </div>
          <span className="text-sm font-semibold text-success-300 uppercase tracking-wider">
            转录完成
          </span>
          <Badge className="ml-auto bg-success/10 text-success border-success/20">
            {finalText.length} 字
          </Badge>
        </div>
        <div className="prose prose-invert max-w-none">
          <p className="text-success-50 text-lg leading-relaxed whitespace-pre-wrap">
            {finalText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalTranscriptCard;
