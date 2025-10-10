import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';

interface IncomingMeetingsProps {
  className?: string;
}

const IncomingMeetings: React.FC<IncomingMeetingsProps> = ({ className }) => {
  const { meetings: allMeetings, loading } = useMeetings();

  // Filter for scheduled meetings happening within the next two days
  const upcomingMeetings = useMemo(() => {
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    return allMeetings
      .filter(meeting => {
        if (meeting.status !== 'scheduled') return false;
        if (!meeting.scheduledStart) return false;
        
        const scheduledDate = new Date(meeting.scheduledStart);
        return scheduledDate >= now && scheduledDate <= twoDaysLater;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduledStart!);
        const dateB = new Date(b.scheduledStart!);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  }, [allMeetings]);

  const formatDate = (dateStr: Date | string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const formatTime = (dateStr: Date | string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 dark:bg-primary/20">
            <Calendar className="w-5 h-5 text-primary dark:text-primary/80" />
          </div>
          <div>
            <CardTitle className="text-lg">即将到来的会议</CardTitle>
            <CardDescription className="text-sm">
              未来两天的会议安排
            </CardDescription>
          </div>
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
        ) : upcomingMeetings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">暂无即将到来的会议</p>
            <p className="text-sm">未来两天内没有安排会议</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingMeetings.map((meeting) => (
              <Link key={meeting._id} to={`/meetings/${meeting._id}`}>
                <div className="group p-4 rounded-lg border border-border/50 hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary/30 dark:hover:border-primary/70 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{meeting.title}</h4>
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400">
                          即将开始
                        </Badge>
                      </div>
                      {meeting.summary && (
                        <p className="text-xs text-muted-foreground mb-3">{meeting.summary}</p>
                      )}
                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        {meeting.scheduledStart && (
                          <>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(meeting.scheduledStart)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatTime(meeting.scheduledStart)}</span>
                            </div>
                          </>
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

export default IncomingMeetings;
