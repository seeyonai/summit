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
  TrendingUpIcon,
  BarChart3Icon
} from 'lucide-react';
import PipelineStageCard from './PipelineStageCard';

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
      'bg-gradient-to-r from-primary/30 to-accent/30',
      'bg-gradient-to-r from-success/30 to-success/30',
      'bg-gradient-to-r from-warning/30 to-warning/30',
      'bg-gradient-to-r from-chart-4/30 to-chart-4/30',
      'bg-gradient-to-r from-chart-5/30 to-chart-5/30'
    ];
    
    return (
      <div className="space-y-4">
        <div className="relative h-24 bg-muted rounded-xl overflow-hidden">
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
            <span className="text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded">0:00</span>
            <span className="text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded">{formatTime(maxTime)}</span>
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

  const empty = !recording.speakerSegments || recording.speakerSegments.length === 0;
  const primaryButton = (
    <Button
      onClick={() => runSpeakerSegmentation()}
      disabled={segmenting}
      size={empty ? 'lg' : 'sm'}
      variant={empty ? 'default' : 'outline'}
    >
      {segmenting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          分析中...
        </>
      ) : (
        <>
          <UsersIcon className="w-4 h-4 mr-2" />
          {empty ? '开始分析' : '重新分析'}
        </>
      )}
    </Button>
  );

  return (
    <PipelineStageCard
      icon={<BarChart3Icon className="w-5 h-5 text-white" />}
      title="说话人分析"
      description="识别和分析录音中的不同说话人"
      primaryButton={primaryButton}
      isEmpty={empty}
      emptyIcon={<UsersIcon className="w-12 h-12" />}
      emptyMessage="暂无说话人分析结果"
    >
      {!empty && (
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
                    'from-primary/30 to-accent/30',
                    'from-success/30 to-success/30',
                    'from-warning/30 to-warning/30',
                    'from-chart-4/30 to-chart-4/30',
                    'from-chart-5/30 to-chart-5/30'
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
                            <p className="text-muted-foreground">发言时长</p>
                            <p className="font-medium">{formatTime(totalTime)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">占比</p>
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
                        'border-primary',
                        'border-success',
                        'border-warning',
                        'border-chart-4',
                        'border-chart-5'
                      ];
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center gap-3 p-3 bg-muted rounded-lg border-l-4 ${speakerColors[segment.speakerIndex % speakerColors.length]}`}
                        >
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-muted to-card rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-foreground">{segment.speakerIndex + 1}</span>
                            </div>
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 text-sm">
                              <ClockIcon className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">
                                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                              </span>
                              <span className="text-muted-foreground">
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

          {/* Conversation Insights */}
          <Separator className="my-6" />
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">对话洞察</h3>
              <p className="text-sm text-muted-foreground">基于说话人分析的对话模式</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
                <MessageSquareIcon className="w-8 h-8 text-primary dark:text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {recording.speakerSegments.length}
                </p>
                <p className="text-sm text-muted-foreground">总发言次数</p>
              </div>
              
              <div className="text-center p-4 bg-success/10 dark:bg-success/20 rounded-lg">
                <TrendingUpIcon className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {Math.round((recording.speakerSegments.length / (recording.duration || 1)) * 60)}
                </p>
                <p className="text-sm text-muted-foreground">每分钟切换</p>
              </div>
              
              <div className="text-center p-4 bg-accent/5 dark:bg-accent/10 rounded-lg">
                <ClockIcon className="w-8 h-8 text-accent dark:text-accent mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {formatTime(
                    recording.speakerSegments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0) / recording.speakerSegments.length
                  )}
                </p>
                <p className="text-sm text-muted-foreground">平均发言时长</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </PipelineStageCard>
  );
}

export default RecordingAnalysis;
