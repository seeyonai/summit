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
    <Card className="bg-gradient-to-r from-emerald-900/10 to-green-900/10 border-emerald-500/20 backdrop-blur-sm shadow-xl shadow-emerald-500/5">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">
            转录完成
          </span>
          <Badge className="ml-auto bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
            {finalText.length} 字
          </Badge>
        </div>
        <div className="prose prose-invert max-w-none">
          <p className="text-emerald-50 text-lg leading-relaxed whitespace-pre-wrap">
            {finalText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalTranscriptCard;
