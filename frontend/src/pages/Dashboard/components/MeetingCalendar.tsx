import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import type { Meeting } from '@/types';

interface MeetingCalendarProps {
  meetings: Meeting[];
  loading?: boolean;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  meetings: Meeting[];
}

function MeetingCalendar({ meetings, loading }: MeetingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInCurrentMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: CalendarDay[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date, isCurrentMonth: false, meetings: [] });
    }

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(year, month, day);
      const dayMeetings = meetings.filter(meeting => {
        if (!meeting.scheduledStart) return false;
        const meetingDate = new Date(meeting.scheduledStart);
        return meetingDate.getDate() === day &&
               meetingDate.getMonth() === month &&
               meetingDate.getFullYear() === year;
      });
      days.push({ date, isCurrentMonth: true, meetings: dayMeetings });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({ date, isCurrentMonth: false, meetings: [] });
    }

    return days;
  }, [currentDate, meetings]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const monthName = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50',
      in_progress: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200/50 dark:border-green-800/50',
      completed: 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-gray-800/50',
      failed: 'bg-destructive dark:bg-destructive/20 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-800/50'
    };
    return colors[status as keyof typeof colors] || colors.scheduled;
  };

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <Calendar className="w-4 h-4 text-primary dark:text-primary/80" />
            </div>
            <CardTitle className="text-base">会议日历</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs">
              今天
            </Button>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-[120px] text-center font-semibold text-sm">
                {monthName}
              </div>
              <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 border-t">
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground border-b bg-muted/30">
                {day}
              </div>
            ))}
            
            {daysInMonth.map((day, index) => {
              const today = isToday(day.date);
              const hasMeetings = day.meetings.length > 0;
              
              return (
                <div key={index} className={`min-h-[100px] p-1.5 border-b border-r ${index % 7 === 6 ? 'border-r-0' : ''} ${!day.isCurrentMonth ? 'bg-muted/10' : 'bg-background'} hover:bg-muted/20 transition-colors`}>
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-1">
                      {today ? (
                        <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium">
                          {day.date.getDate()}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium ${!day.isCurrentMonth ? 'text-muted-foreground/50' : ''}`}>
                          {day.date.getDate()}
                        </span>
                      )}
                      {hasMeetings && day.isCurrentMonth && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {day.meetings.length}
                        </Badge>
                      )}
                    </div>
                    
                    {day.isCurrentMonth && (
                      <div className="flex-1 space-y-0.5 overflow-y-auto">
                        {day.meetings.slice(0, 2).map((meeting, idx) => {
                          const meetingTime = meeting.scheduledStart 
                            ? new Date(meeting.scheduledStart).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) 
                            : '';
                          
                          return (
                            <div key={idx} className={`group p-1 rounded text-[10px] border ${getStatusColor(meeting.status)} hover:shadow-sm transition-all cursor-pointer`}>
                              <div className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{meetingTime}</div>
                                  <div className="truncate opacity-80 leading-tight">{meeting.title}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {day.meetings.length > 2 && (
                          <div className="text-[10px] text-muted-foreground text-center py-0.5">
                            +{day.meetings.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MeetingCalendar;
