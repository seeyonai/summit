import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, Calendar, ActivityIcon, TargetIcon } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import IncomingMeetings from './components/IncomingMeetings';
import PendingMeetings from './components/PendingMeetings';
import MeetingCalendar from './components/MeetingCalendar';
import { useMeetings } from '@/hooks/useMeetings';
import { apiService } from '@/services/api';
import type { Recording } from '@/types';

const Dashboard: React.FC = () => {
  const { meetings, loading } = useMeetings();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recentRecordings, setRecentRecordings] = useState<string[]>([]);

  // Fetch recordings on mount
  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const data = await apiService.getRecordings();
        setRecordings(data);
      } catch (err) {
        console.error('Error fetching recordings:', err);
      }
    };
    fetchRecordings();
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMeetings = meetings.length;
    const scheduledCount = meetings.filter(m => m.status === 'scheduled').length;
    const inProgressCount = meetings.filter(m => m.status === 'in_progress').length;
    const completedCount = meetings.filter(m => m.status === 'completed').length;
    const totalRecordings = recordings.length;
    const totalTodos = meetings.reduce((acc, m) => acc + (m.parsedTodos?.length || 0), 0);
    const completedTodos = meetings.reduce((acc, m) => 
      acc + (m.parsedTodos?.filter(t => t.completed).length || 0), 0);
    const todoCompletionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;
    
    return {
      totalMeetings,
      scheduledCount,
      inProgressCount,
      completedCount,
      totalRecordings,
      totalTodos,
      completedTodos,
      todoCompletionRate
    };
  }, [meetings, recordings]);

  return (
    <div className="space-y-8">
      <PageHeader title="仪表盘" subline="全面掌握您的会议和录音数据">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">总会议数</p>
                <p className="stat-value">{stats.totalMeetings}</p>
              </div>
              <Calendar className="stat-icon" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">进行中</p>
                <p className="stat-value">{stats.inProgressCount}</p>
              </div>
              <ActivityIcon className="stat-icon" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">任务完成率</p>
                <p className="stat-value">{stats.todoCompletionRate.toFixed(0)}%</p>
              </div>
              <TargetIcon className="stat-icon" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">总录音数</p>
                <p className="stat-value">{stats.totalRecordings}</p>
              </div>
              <Mic className="stat-icon" />
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <MeetingCalendar meetings={meetings} loading={loading} />
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