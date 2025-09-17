import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Calendar } from 'lucide-react';

interface PendingItem {
  id: string;
  title: string;
  type: 'transcript' | 'meeting';
  status: 'pending_create' | 'needs_polish';
  date: string;
}

interface PendingMeetingsProps {
  className?: string;
}

const PendingMeetings: React.FC<PendingMeetingsProps> = ({ className }) => {
  const [pendingItems] = useState<PendingItem[]>([
    {
      id: '1',
      title: '团队周会录音',
      type: 'transcript',
      status: 'pending_create',
      date: '2024-01-14'
    },
    {
      id: '2',
      title: '客户访谈录音',
      type: 'transcript',
      status: 'needs_polish',
      date: '2024-01-13'
    },
    {
      id: '3',
      title: '产品评审会议',
      type: 'meeting',
      status: 'pending_create',
      date: '2024-01-12'
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_create':
        return <Badge variant="secondary" className="text-xs">待创建</Badge>;
      case 'needs_polish':
        return <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">需要完善</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">未知</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_create':
        return <CheckCircle className="w-4 h-4" />;
      case 'needs_polish':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-100 dark:bg-orange-900/20">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg">待处理事项</CardTitle>
              <CardDescription className="text-sm">
                需要创建或完善转录的会议
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {pendingItems.length} 项待处理
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {pendingItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">暂无待处理事项</p>
            <p className="text-sm">所有事项已完成</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingItems.map((item) => (
              <div key={item.id} className="group p-4 rounded-lg border border-border/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{item.title}</h4>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(item.status)}
                        <span>{item.type === 'meeting' ? '会议' : '转录'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingMeetings;