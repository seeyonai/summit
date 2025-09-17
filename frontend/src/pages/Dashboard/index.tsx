import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Mic } from 'lucide-react';
import QuickRecord from './components/QuickRecord';
import QuickActions from './components/QuickActions';
import IncomingMeetings from './components/IncomingMeetings';
import PendingMeetings from './components/PendingMeetings';

const Dashboard: React.FC = () => {
  const [recentRecordings, setRecentRecordings] = useState<string[]>([]);

  const handleRecordingComplete = (filename: string) => {
    setRecentRecordings(prev => [filename, ...prev.slice(0, 4)]);
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20"></div>
        <div className="relative text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <LayoutDashboard className="w-4 h-4" />
            欢迎回来
          </div>
          <h1 className="text-4xl font-bold tracking-tight gradient-text">仪表板</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            快速访问录音功能，管理会议安排，处理待办事项
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <QuickRecord onRecordingComplete={handleRecordingComplete} />
          <QuickActions />
        </div>
        
        <div className="space-y-6">
          <IncomingMeetings />
          <PendingMeetings />
        </div>
      </div>

      {recentRecordings.length > 0 && (
        <Card className="card-hover border-dashed border-2 border-primary/20 hover:border-primary/40 transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  最近录音
                </CardTitle>
                <CardDescription>
                  最新的录音文件列表
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {recentRecordings.length} 个文件
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecordings.map((recording, index) => (
                <div key={index} className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded">
                      <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium truncate max-w-[200px]">{recording}</span>
                  </div>
                  <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    下载
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;