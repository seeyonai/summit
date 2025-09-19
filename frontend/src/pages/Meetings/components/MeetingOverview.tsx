import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Meeting } from '@/types';
import {
  UsersIcon,
  MicIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CalendarIcon,
  ClockIcon,
  ActivityIcon,
  TargetIcon,
  FileTextIcon,
  TrendingUpIcon
} from 'lucide-react';

interface MeetingOverviewProps {
  meeting: Meeting;
  onRefresh?: () => Promise<void>;
}

function MeetingOverview({ meeting, onRefresh }: MeetingOverviewProps) {
  const completedTodos = meeting.parsedTodos?.filter(t => t.completed).length || 0;
  const totalTodos = meeting.parsedTodos?.length || 0;
  const todoProgress = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;
  
  const totalRecordings = meeting.recordings?.length || 0;
  const hasTranscript = meeting.finalTranscript || 
    meeting.recordings?.some(r => r.transcription);
  
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('zh-CN');
  };

  const formatDuration = (start?: Date | string, end?: Date | string) => {
    if (!start) return '-';
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end ? (end instanceof Date ? end : new Date(end)) : new Date();
    const diff = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}小时${minutes}分钟`;
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">会议状态</p>
                <p className="text-2xl font-bold">
                  {meeting.status === 'scheduled' && '已安排'}
                  {meeting.status === 'in_progress' && '进行中'}
                  {meeting.status === 'completed' && '已完成'}
                  {meeting.status === 'failed' && '失败'}
                </p>
              </div>
              {meeting.status === 'completed' ? (
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              ) : meeting.status === 'in_progress' ? (
                <ActivityIcon className="w-8 h-8 text-blue-500" />
              ) : (
                <AlertCircleIcon className="w-8 h-8 text-gray-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">参与人数</p>
                <p className="text-2xl font-bold">{meeting.participants || 0}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">录音数量</p>
                <p className="text-2xl font-bold">{totalRecordings}</p>
              </div>
              <MicIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">任务完成</p>
                <p className="text-2xl font-bold">
                  {totalTodos > 0 ? `${Math.round(todoProgress)}%` : '-'}
                </p>
              </div>
              <TargetIcon className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>会议时间线</CardTitle>
          <CardDescription>会议的关键时间节点</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-6">
              {/* Scheduled Time */}
              <div className="flex items-center gap-4">
                <div className="relative z-10 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">计划开始</p>
                  <p className="text-sm text-gray-600">{formatDate(meeting.scheduledStart)}</p>
                </div>
              </div>

              {/* Actual Start */}
              {meeting.actualStart && (
                <div className="flex items-center gap-4">
                  <div className="relative z-10 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">实际开始</p>
                    <p className="text-sm text-gray-600">{formatDate(meeting.actualStart)}</p>
                  </div>
                </div>
              )}

              {/* End Time */}
              {meeting.actualEnd && (
                <div className="flex items-center gap-4">
                  <div className="relative z-10 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">会议结束</p>
                    <p className="text-sm text-gray-600">{formatDate(meeting.actualEnd)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      持续时间: {formatDuration(meeting.actualStart, meeting.actualEnd)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Progress */}
      {totalTodos > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>任务进度</CardTitle>
            <CardDescription>会议相关任务的完成情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">总体进度</span>
                <span className="text-sm text-gray-600">
                  {completedTodos} / {totalTodos} 已完成
                </span>
              </div>
              <Progress value={todoProgress} className="h-3" />
              
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalTodos}</p>
                  <p className="text-sm text-gray-600">总任务数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{completedTodos}</p>
                  <p className="text-sm text-gray-600">已完成</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {totalTodos - completedTodos}
                  </p>
                  <p className="text-sm text-gray-600">待处理</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meeting Insights */}
      <Card>
        <CardHeader>
          <CardTitle>会议洞察</CardTitle>
          <CardDescription>基于会议数据的分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FileTextIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-900">
                {meeting.agenda?.length || 0}
              </p>
              <p className="text-sm text-blue-700">议程项目</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUpIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">
                {hasTranscript ? '已' : '未'}转录
              </p>
              <p className="text-sm text-green-700">转录状态</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <ActivityIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-900">
                {meeting.disputedIssues?.length || 0}
              </p>
              <p className="text-sm text-purple-700">争议问题</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MeetingOverview;
