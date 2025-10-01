import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  className?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({ className }) => {
  const actions = [
    {
      icon: Plus,
      label: '创建会议',
      description: '创建新的会议记录',
      to: '/meetings',
      color: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    {
      icon: Flame,
      label: '热词',
      description: '管理语音识别热词',
      to: '/hotwords',
      color: 'bg-orange-100 text-orange-800 border-orange-300'
    },
  ];

  return (
    <Card className={cn("card-hover border-l-4 border-l-purple-500 dark:border-l-purple-600", className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-r from-primary/30 to-purple-500/30">
            <div className="w-5 h-5 bg-white rounded"></div>
          </div>
          <div>
            <CardTitle className="text-lg">快速操作</CardTitle>
            <CardDescription className="text-sm">
              常用功能快速访问
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action, index) => (
            <Link key={index} to={action.to}>
              <div className="group flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 hover:shadow-sm transition-all duration-200 cursor-pointer hover:border-primary/30">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", action.color, "group-hover:scale-110 transition-transform duration-200")}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-sm group-hover:text-primary transition-colors">{action.label}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;