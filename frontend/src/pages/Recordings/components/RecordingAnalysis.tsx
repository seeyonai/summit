import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api';
import type { Recording, SpeakerName } from '@/types';
import { buildSpeakerNameMap, getSpeakerDisplayName } from '@/utils/speakerNames';
import {
  UsersIcon,
  ClockIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  BarChart3Icon
} from 'lucide-react';
import PipelineStageCard from './PipelineStageCard';
import StatisticsCard from '@/components/StatisticsCard';
import SpeakerNameEditor from '@/components/SpeakerNameEditor';

type AlignmentToken = {
  text: string;
  startMs: number;
  endMs: number;
};

const MAX_SEGMENT_SNIPPET_LENGTH = 80;

interface RecordingAnalysisProps {
  recording: Recording;
  onRefresh: () => Promise<void>;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
}

function RecordingAnalysis({ recording, onRefresh, setSuccess, setError }: RecordingAnalysisProps) {
  const [segmenting, setSegmenting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [oracleNum, setOracleNum] = useState<string>('');
  const speakerNames = recording.speakerNames;
  const speakerNameMap = useMemo(() => buildSpeakerNameMap(speakerNames), [speakerNames]);

  const handleSaveSpeakerNames = async (speakerNames: SpeakerName[]) => {
    try {
      await apiService.updateRecording(recording._id, { speakerNames });
      await onRefresh();
      setSuccess('说话人名称已更新');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
      throw err;
    }
  };

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
                title={`${getSpeakerDisplayName(segment.speakerIndex, speakerNameMap)}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
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
              {getSpeakerDisplayName(speakerIndex, speakerNameMap)}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const alignmentTokens = useMemo<AlignmentToken[]>(() => {
    if (!Array.isArray(recording.alignmentItems) || recording.alignmentItems.length === 0) {
      return [];
    }

    return recording.alignmentItems.flatMap(item => {
      const words = typeof item?.text === 'string' ? item.text.split(/\s+/).filter(Boolean) : [];
      const timestamps = Array.isArray(item?.timestamp) ? item.timestamp : [];

      return words.map((word, index) => {
        const pair = timestamps[index];
        const startValue = Array.isArray(pair) ? Number(pair[0]) : Number.NaN;
        const endValue = Array.isArray(pair) ? Number(pair[1]) : Number.NaN;

        if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || endValue <= startValue) {
          return null;
        }

        return {
          text: word,
          startMs: startValue,
          endMs: endValue,
        } as AlignmentToken;
      }).filter((token): token is AlignmentToken => Boolean(token));
    });
  }, [recording.alignmentItems]);

  const segmentTexts = useMemo(() => {
    if (!Array.isArray(recording.speakerSegments) || recording.speakerSegments.length === 0) {
      return {} as Record<number, string>;
    }

    const organizedSpeeches = Array.isArray(recording.organizedSpeeches) ? recording.organizedSpeeches : [];
    const result: Record<number, string> = {};

    recording.speakerSegments.forEach((segment, index) => {
      const overlappingSpeech = organizedSpeeches.find(speech => (
        speech.speakerIndex === segment.speakerIndex
        && speech.endTime > segment.startTime
        && speech.startTime < segment.endTime
      ));

      if (overlappingSpeech) {
        const text = (overlappingSpeech.polishedText || overlappingSpeech.rawText || '').trim();
        if (text) {
          result[index] = text;
          return;
        }
      }

      if (alignmentTokens.length > 0) {
        const segStartMs = Math.max(0, Math.round(segment.startTime * 1000));
        const segEndMs = Math.max(segStartMs, Math.round(segment.endTime * 1000));
        const snippet = alignmentTokens
          .filter(token => token.endMs > segStartMs && token.startMs < segEndMs)
          .map(token => token.text)
          .join(' ')
          .trim();

        if (snippet) {
          result[index] = snippet;
        }
      }
    });

    return result;
  }, [recording.speakerSegments, recording.organizedSpeeches, alignmentTokens]);

  const getSegmentPreview = (index: number) => {
    const text = segmentTexts[index];
    if (!text) {
      return null;
    }
    return text.length > MAX_SEGMENT_SNIPPET_LENGTH
      ? `${text.slice(0, MAX_SEGMENT_SNIPPET_LENGTH)}…`
      : text;
  };

  const handleAnalysisClick = () => {
    setOracleNum('');
    setDialogOpen(true);
  };

  const handleConfirmAnalysis = () => {
    const numSpeakers = oracleNum.trim() ? parseInt(oracleNum, 10) : undefined;
    setDialogOpen(false);
    runSpeakerSegmentation(numSpeakers);
  };

  const empty = !recording.speakerSegments || recording.speakerSegments.length === 0;
  const primaryButton = (
    <Button
      onClick={handleAnalysisClick}
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
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>说话人数量</DialogTitle>
            <DialogDescription>
              请输入预期的说话人数量（可选）。如不指定，系统将自动检测。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="oracle-num">说话人数量</Label>
              <Input
                id="oracle-num"
                type="number"
                min="1"
                max="20"
                placeholder="留空表示自动检测"
                value={oracleNum}
                onChange={(e) => setOracleNum(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmAnalysis();
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">
                常用选项：2人、3人、4人对话等
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <p className="text-sm font-medium text-muted-foreground w-full mb-1">快速选择：</p>
              {[2, 3, 4, 5, 6].map(num => (
                <Button
                  key={num}
                  onClick={() => setOracleNum(num.toString())}
                  variant={oracleNum === num.toString() ? 'default' : 'outline'}
                  size="sm"
                >
                  {num}人
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmAnalysis}>
              开始分析
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground mb-1">说话人统计</h3>
                  <p className="text-sm text-muted-foreground">各说话人的发言时长与占比分析</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {Array.from(new Set(recording.speakerSegments?.map(s => s.speakerIndex))).map(speakerIndex => {
                    if (!recording.speakerSegments) {
                      return null;
                    }
                    const segments = recording.speakerSegments.filter(s => s.speakerIndex === speakerIndex);
                    const totalTime = segments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0);
                    const percentage = (totalTime / (recording.duration || 1)) * 100;
                    const avgSegmentTime = totalTime / segments.length;
                    
                    const speakerColors = [
                      { gradient: 'from-primary/20 to-accent/20', border: 'border-primary/40', icon: 'bg-primary/10 text-primary', progress: 'bg-primary' },
                      { gradient: 'from-success/20 to-success/20', border: 'border-success/40', icon: 'bg-success/10 text-success', progress: 'bg-success' },
                      { gradient: 'from-warning/20 to-warning/20', border: 'border-warning/40', icon: 'bg-warning/10 text-warning', progress: 'bg-warning' },
                      { gradient: 'from-chart-4/20 to-chart-4/20', border: 'border-chart-4/40', icon: 'bg-chart-4/10 text-chart-4', progress: 'bg-chart-4' },
                      { gradient: 'from-chart-5/20 to-chart-5/20', border: 'border-chart-5/40', icon: 'bg-chart-5/10 text-chart-5', progress: 'bg-chart-5' }
                    ];
                    
                    const colors = speakerColors[speakerIndex % speakerColors.length];
                    
                    return (
                      <Card key={speakerIndex} className={`overflow-hidden border-2 ${colors.border} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex-1 min-w-[200px] max-w-[280px]`}>
                        <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center font-bold text-lg`}>
                                {speakerIndex + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-lg leading-tight">{getSpeakerDisplayName(speakerIndex, speakerNameMap)}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{segments.length} 个发言片段</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">发言占比</span>
                                <span className="text-sm font-bold">{percentage.toFixed(1)}%</span>
                              </div>
                              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full ${colors.progress} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div className="bg-muted/50 rounded-lg p-2.5">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <ClockIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">总时长</span>
                                </div>
                                <p className="text-base font-semibold">{formatTime(totalTime)}</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2.5">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <TrendingUpIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">平均时长</span>
                                </div>
                                <p className="text-base font-semibold">{formatTime(avgSegmentTime)}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Speaker Name Editor */}
              {recording.speakerSegments && (
                <SpeakerNameEditor
                  speakerIndices={Array.from(new Set(recording.speakerSegments.map(s => s.speakerIndex)))}
                  currentSpeakerNames={recording.speakerNames}
                  onSave={handleSaveSpeakerNames}
                  disabled={segmenting}
                />
              )}

              {/* Detailed Segments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">发言片段详情</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {recording.speakerSegments?.map((segment, index) => {
                      const speakerColors = [
                        'border-primary',
                        'border-success',
                        'border-warning',
                        'border-chart-4',
                        'border-chart-5'
                      ];
                      const preview = getSegmentPreview(index);
                      const fullText = segmentTexts[index];
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center gap-3 p-3 bg-muted rounded-lg border-l-4 ${speakerColors[segment.speakerIndex % speakerColors.length]}`}
                        >
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-muted to-card rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-foreground" title={getSpeakerDisplayName(segment.speakerIndex, speakerNameMap)}>
                                {segment.speakerIndex + 1}
                              </span>
                            </div>
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <ClockIcon className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">
                                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                              </span>
                              <span className="text-muted-foreground">
                                ({formatTime(segment.endTime - segment.startTime)})
                              </span>
                            </div>
                            <div
                              className={`mt-1 text-sm text-muted-foreground ${preview ? 'truncate' : 'italic opacity-80 truncate'}`}
                              title={fullText || undefined}
                            >
                              {preview || '暂无对应文本'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
              <StatisticsCard
                icon={<MessageSquareIcon className="w-4 h-4 text-primary" />}
                label="总发言次数"
                value={recording.speakerSegments?.length || 0}
                description="对话中的发言片段总数"
              />

              <StatisticsCard
                icon={<TrendingUpIcon className="w-4 h-4 text-success" />}
                label="每分钟切换"
                value={Math.round(((recording.speakerSegments?.length || 0) / (recording.duration || 1)) * 60)}
                description="说话人切换频率"
              />

              <StatisticsCard
                icon={<ClockIcon className="w-4 h-4 text-accent" />}
                label="平均发言时长"
                value={formatTime(
                  (recording.speakerSegments?.reduce((acc, s) => acc + (s.endTime - s.startTime), 0) || 0) / (recording.speakerSegments?.length || 1)
                )}
                description="每段发言的平均长度"
              />
            </div>
          </div>
        </div>
      )}
      </PipelineStageCard>
    </>
  );
}

export default RecordingAnalysis;
