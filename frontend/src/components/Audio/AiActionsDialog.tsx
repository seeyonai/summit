import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles,
  Target,
  Users,
  Lightbulb,
  FileText,
  Brain,
  Zap
} from 'lucide-react';

interface AiActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionSelect: (option: string) => void;
  themeClasses: {
    text: {
      primary: string;
      secondary: string;
    };
  };
}

const AiActionsDialog: React.FC<AiActionsDialogProps> = ({
  open,
  onOpenChange,
  onActionSelect,
  themeClasses
}) => {
  const aiOptions = [
    { id: '梳理议程', title: '梳理议程', description: '整理和优化会议议程结构', icon: Target, color: 'blue' },
    { id: '调节争议', title: '调节争议', description: '协助调解会议中的分歧', icon: Users, color: 'emerald' },
    { id: '头脑风暴', title: '头脑风暴', description: '激发创意和新想法', icon: Lightbulb, color: 'purple' },
    { id: '生成摘要', title: '生成摘要', description: '自动生成会议纪要', icon: FileText, color: 'orange' },
    { id: '智能分析', title: '智能分析', description: '深度分析会议内容', icon: Brain, color: 'pink' },
    { id: '行动计划', title: '行动计划', description: '制定后续行动方案', icon: Zap, color: 'cyan' }
  ];

  const handleOptionClick = (optionId: string) => {
    onActionSelect(optionId);
    onOpenChange(false);
  };

  const getCardClasses = (color: string) => {
    const baseClasses = "group cursor-pointer bg-gradient-to-br border hover:border-400/50 transition-all hover:shadow-lg";
    const hoverShadowClasses = `hover:shadow-${color}-500/20`;
    
    switch (color) {
      case 'blue':
        return `${baseClasses} from-blue-600/10 to-blue-700/10 border-blue-500/20 ${hoverShadowClasses}`;
      case 'emerald':
        return `${baseClasses} from-emerald-600/10 to-emerald-700/10 border-emerald-500/20 ${hoverShadowClasses}`;
      case 'purple':
        return `${baseClasses} from-purple-600/10 to-purple-700/10 border-purple-500/20 ${hoverShadowClasses}`;
      case 'orange':
        return `${baseClasses} from-orange-600/10 to-orange-700/10 border-orange-500/20 ${hoverShadowClasses}`;
      case 'pink':
        return `${baseClasses} from-pink-600/10 to-pink-700/10 border-pink-500/20 ${hoverShadowClasses}`;
      case 'cyan':
        return `${baseClasses} from-cyan-600/10 to-cyan-700/10 border-cyan-500/20 ${hoverShadowClasses}`;
      default:
        return `${baseClasses} from-blue-600/10 to-blue-700/10 border-blue-500/20 ${hoverShadowClasses}`;
    }
  };

  const getIconClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return "w-8 h-8 text-blue-400";
      case 'emerald':
        return "w-8 h-8 text-emerald-400";
      case 'purple':
        return "w-8 h-8 text-purple-400";
      case 'orange':
        return "w-8 h-8 text-orange-400";
      case 'pink':
        return "w-8 h-8 text-pink-400";
      case 'cyan':
        return "w-8 h-8 text-cyan-400";
      default:
        return "w-8 h-8 text-blue-400";
    }
  };

  const getBackgroundClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return "p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors";
      case 'emerald':
        return "p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors";
      case 'purple':
        return "p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors";
      case 'orange':
        return "p-3 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors";
      case 'pink':
        return "p-3 bg-pink-500/10 rounded-xl group-hover:bg-pink-500/20 transition-colors";
      case 'cyan':
        return "p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors";
      default:
        return "p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700/50 max-w-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            AI 助手功能
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {aiOptions.map((option) => (
            <Card 
              key={option.id}
              className={getCardClasses(option.color)}
              onClick={() => handleOptionClick(option.id)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className={getBackgroundClasses(option.color)}>
                  <option.icon className={getIconClasses(option.color)} />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{option.title}</h3>
                  <p className="text-xs text-slate-400">{option.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <DialogFooter className="mt-6">
          <Button 
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AiActionsDialog;
