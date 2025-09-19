import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface QuickActionsCardProps {
  onOpenAIDialog: () => void;
  themeClasses: {
    card: string;
    text: {
      primary: string;
      secondary: string;
    };
  };
}

const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onOpenAIDialog,
  themeClasses
}) => {
  return (
    <Card className={`${themeClasses.card} backdrop-blur-sm`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>AI 助手</h3>
        </div>
        <div className="space-y-3">
          <Button
            onClick={onOpenAIDialog}
            className="w-full bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-500/80 hover:to-purple-500/80 text-white transition-all shadow-lg hover:shadow-purple-500/10"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI 助手
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsCard;
