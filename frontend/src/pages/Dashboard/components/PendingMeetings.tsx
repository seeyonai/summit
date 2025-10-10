import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Calendar, FileAudio } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';

interface PendingItem {
  id: string;
  title: string;
  type: 'meeting';
  status: 'incomplete_todos' | 'has_issues' | 'no_transcript';
  date: string;
  count?: number;
}

interface PendingMeetingsProps {
  className?: string;
}

const PendingMeetings: React.FC<PendingMeetingsProps> = ({ className }) => {
  const { meetings: allMeetings, loading } = useMeetings();

  // Filter for meetings that need attention
  const pendingItems = useMemo(() => {
    const items: PendingItem[] = [];
    
    allMeetings.forEach(meeting => {
      // Skip scheduled meetings (not yet started)
      if (meeting.status === 'scheduled') return;
      
      const createdDate = meeting.createdAt ? new Date(meeting.createdAt).toISOString().split('T')[0] : '';
      
      // Check for incomplete todos
      const incompleteTodos = meeting.todos?.filter(t => !t.completed) || [];
      if (incompleteTodos.length > 0) {
        items.push({
          id: meeting._id,
          title: meeting.title,
          type: 'meeting',
          status: 'incomplete_todos',
          date: createdDate,
          count: incompleteTodos.length
        });
      }
      
      // Check for disputed issues
      const unresolvedIssues = meeting.disputedIssues?.filter(i => i.status !== 'resolved') || [];
      if (unresolvedIssues.length > 0 && incompleteTodos.length === 0) {
        items.push({
          id: meeting._id,
          title: meeting.title,
          type: 'meeting',
          status: 'has_issues',
          date: createdDate,
          count: unresolvedIssues.length
        });
      }
      
      // Check for meetings without transcript
      if (meeting.status === 'completed' && !meeting.finalTranscript && incompleteTodos.length === 0 && unresolvedIssues.length === 0) {
        items.push({
          id: meeting._id,
          title: meeting.title,
          type: 'meeting',
          status: 'no_transcript',
          date: createdDate
        });
      }
    });
    
    return items.slice(0, 5);
  }, [allMeetings]);

  const getStatusBadge = (status: string, count?: number) => {
    switch (status) {
      case 'incomplete_todos':
        return <Badge variant="secondary" className="text-xs">{count} 个待办任务</Badge>;
      case 'has_issues':
        return <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400">{count} 个争议问题</Badge>;
      case 'no_transcript':
        return <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400">缺少记录</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">未知</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'incomplete_todos':
        return <CheckCircle className="w-4 h-4" />;
      case 'has_issues':
        return <Clock className="w-4 h-4" />;
      case 'no_transcript':
        return <FileAudio className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'incomplete_todos':
        return '任务';
      case 'has_issues':
        return '争议';
      case 'no_transcript':
        return '记录';
      default:
        return '会议';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-warning/10 dark:bg-warning/20">
              <Clock className="w-5 h-5 text-warning dark:text-warning/80" />
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
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-muted rounded-lg" />
              <div className="h-20 bg-muted rounded-lg" />
            </div>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">暂无待处理事项</p>
            <p className="text-sm">所有事项已完成</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingItems.map((item) => (
              <Link key={item.id} to={`/meetings/${item.id}?tab=analysis&subtab=todos`}>
                <div className="group p-4 rounded-lg border border-border/50 hover:bg-warning/10 dark:hover:bg-warning/20 hover:border-warning/30 dark:hover:border-warning/70 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{item.title}</h4>
                        {getStatusBadge(item.status, item.count)}
                      </div>
                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(item.status)}
                          <span>{getStatusLabel(item.status)}</span>
                        </div>
                        {item.date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{item.date}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingMeetings;