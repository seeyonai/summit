import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'incoming' | 'pending';
  participants?: number;
  summary?: string;
}

interface IncomingMeetingsProps {
  className?: string;
}

const IncomingMeetings: React.FC<IncomingMeetingsProps> = ({ className }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useState(() => {
    setMeetings([
      {
        id: '1',
        title: '产品规划会议',
        date: '2024-01-15',
        time: '14:00',
        status: 'incoming',
        participants: 5,
        summary: '讨论Q1产品路线图'
      },
      {
        id: '2',
        title: '技术评审',
        date: '2024-01-16',
        time: '10:00',
        status: 'incoming',
        participants: 3,
        summary: '新架构方案评审'
      }
    ]);
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/20">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">即将到来的会议</CardTitle>
            <CardDescription className="text-sm">
              今天的会议安排
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">暂无即将到来的会议</p>
            <p className="text-sm">今天没有安排会议</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <Link key={meeting.id} to={`/meetings/${meeting.id}`}>
                <div className="group p-4 rounded-lg border border-border/50 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{meeting.title}</h4>
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400">
                          即将开始
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{meeting.summary}</p>
                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{meeting.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{meeting.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>{meeting.participants} 人</span>
                        </div>
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
