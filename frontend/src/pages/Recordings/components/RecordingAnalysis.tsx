import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiService } from '@/services/api';
import type { Recording } from '@/types';
import {
  UsersIcon,
  ClockIcon,
  MessageSquareIcon,
  TrendingUpIcon
} from 'lucide-react';

interface RecordingAnalysisProps {
  recording: Recording;
  onRefresh: () => Promise<void>;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
}

function RecordingAnalysis({ recording, onRefresh, setSuccess, setError }: RecordingAnalysisProps) {
  const [segmenting, setSegmenting] = useState(false);

  const runSpeakerSegmentation = async (oracleNumSpeakers?: number) => {
    try {
      setSegmenting(true);
      const hasHint = typeof oracleNumSpeakers === 'number' && !Number.isNaN(oracleNumSpeakers);
      const { message } = await apiService.segmentRecording(
        recording._id,
        hasHint ? { oracleNumSpeakers } : {}
      );
      await onRefresh();
      setSuccess(message || '说话人分离完成');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSegmenting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSpeakerTimeline = () => {
    if (!recording?.speakerSegments || recording.speakerSegments.length === 0) {
      return null;
    }

    const maxTime = Math.max(...recording.speakerSegments.map(s => s.endTime));
    const speakerColors = [
      'bg-gradient-to-r from-primary/30 to-blue-600/30',
      'bg-gradient-to-r from-green-500/30 to-green-600/30',
      'bg-gradient-to-r from-yellow-500/30 to-yellow-600/30',
      'bg-gradient-to-r from-purple-500/30 to-purple-600/30',
      'bg-gradient-to-r from-pink-500/30 to-pink-600/30'
    ];
    
    return (
      <div className="space-y-4">
        <div className="relative h-24 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
          {recording.speakerSegments.map((segment, index) => {
            const left = (segment.startTime / maxTime) * 100;
            const width = ((segment.endTime - segment.startTime) / maxTime) * 100;
            const colorClass = speakerColors[segment.speakerIndex % speakerColors.length];
            
            return (
              <div
                key={index}
                className={`absolute top-0 h-full ${colorClass} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`说话人 ${segment.speakerIndex + 1}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
              />
            );
          })}
          <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
            <span className="text-xs text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 px-2 py-1 rounded">0:00</span>
            <span className="text-xs text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 px-2 py-1 rounded">{formatTime(maxTime)}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(recording.speakerSegments.map(s => s.speakerIndex))).map(speakerIndex => (
            <Badge
              key={speakerIndex}
              className={`${speakerColors[speakerIndex % speakerColors.length]} text-white`}
            >
              <UsersIcon className="w-3 h-3 mr-1" />
              说话人 {speakerIndex + 1}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>说话人分析</CardTitle>
              <CardDescription>识别和分析录音中的不同说话人</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => runSpeakerSegmentation()}
                disabled={segmenting}
                variant="outline"
                size="sm"
              >
                <UsersIcon className="w-4 h-4 mr-2" />
                {segmenting ? '分析中...' : '自动分析'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recording.speakerSegments && recording.speakerSegments.length > 0 ? (
            <div className="space-y-6">
              {renderSpeakerTimeline()}
              
              <Separator />
              
              {/* Speaker Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from(new Set(recording.speakerSegments.map(s => s.speakerIndex))).map(speakerIndex => {
                  const segments = recording.speakerSegments!.filter(s => s.speakerIndex === speakerIndex);
                  const totalTime = segments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0);
                  const percentage = (totalTime / (recording.duration || 1)) * 100;
                  const speakerColors = [
                    'from-primary/30 to-blue-600/30',
                    'from-green-500/30 to-green-600/30',
                    'from-yellow-500/30 to-yellow-600/30',
                    'from-purple-500/30 to-purple-600/30',
                    'from-pink-500/30 to-pink-600/30'
                  ];
                  
                  return (
                    <Card key={speakerIndex} className="overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${speakerColors[speakerIndex % speakerColors.length]}`} />
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-lg">说话人 {speakerIndex + 1}</span>
                          <Badge variant="secondary">{segments.length} 段</Badge>
                        </div>
                        <Progress value={percentage} className="mb-3" />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">发言时长</p>
                            <p className="font-medium">{formatTime(totalTime)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">占比</p>
                            <p className="font-medium">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Detailed Segments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">发言片段详情</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {recording.speakerSegments.map((segment, index) => {
                      const speakerColors = [
                        'border-blue-500',
                        'border-green-500',
                        'border-yellow-500',
                        'border-purple-500',
                        'border-pink-500'
                      ];
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 ${speakerColors[segment.speakerIndex % speakerColors.length]}`}
                        >
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{segment.speakerIndex + 1}</span>
                            </div>
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 text-sm">
                              <ClockIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                              <span className="font-medium">
                                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                ({formatTime(segment.endTime - segment.startTime)})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">快速重新分析</CardTitle>
                  <CardDescription>指定说话人数量进行精确分析</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[2, 3, 4, 5, 6].map(num => (
                      <Button
                        key={num}
                        onClick={() => runSpeakerSegmentation(num)}
                        disabled={segmenting}
                        variant="outline"
                        size="sm"
                      >
                        {num}人对话
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">暂无说话人分析结果</p>
              <div className="space-y-3">
                <Button
                  onClick={() => runSpeakerSegmentation()}
                  disabled={segmenting}
                >
                  {segmenting ? '分析中...' : '开始分析'}
                </Button>
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => runSpeakerSegmentation(2)}
                    disabled={segmenting}
                    variant="outline"
                    size="sm"
                  >
                    2人对话
                  </Button>
                  <Button
                    onClick={() => runSpeakerSegmentation(3)}
                    disabled={segmenting}
                    variant="outline"
                    size="sm"
                  >
                    3人会议
                  </Button>
                  <Button
                    onClick={() => runSpeakerSegmentation(4)}
                    disabled={segmenting}
                    variant="outline"
                    size="sm"
                  >
                    4人讨论
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Insights */}
      {recording.speakerSegments && recording.speakerSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>对话洞察</CardTitle>
            <CardDescription>基于说话人分析的对话模式</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50/20 dark:bg-blue-900/10 rounded-lg">
                <MessageSquareIcon className="w-8 h-8 text-blue-500 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {recording.speakerSegments.length}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">总发言次数</p>
              </div>
              
              <div className="text-center p-4 bg-green-50/20 dark:bg-green-900/10 rounded-lg">
                <TrendingUpIcon className="w-8 h-8 text-green-500 dark:text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {Math.round((recording.speakerSegments.length / (recording.duration || 1)) * 60)}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">每分钟切换</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50/20 dark:bg-blue-900/10 rounded-lg">
                <ClockIcon className="w-8 h-8 text-purple-500 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {formatTime(
                    recording.speakerSegments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0) / recording.speakerSegments.length
                  )}
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">平均发言时长</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RecordingAnalysis;
