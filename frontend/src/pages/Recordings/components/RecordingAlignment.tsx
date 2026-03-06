import { useEffect, useState, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ButtonGroup } from '@/components/ui/button-group';
import type { Recording } from '@/types';
import { AlignLeftIcon, PauseIcon, PlayIcon, SquareIcon } from 'lucide-react';
import { apiService } from '@/services/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PipelineStageCard from './PipelineStageCard';

export interface RecordingAlignmentHandle {
  runAlignment: () => Promise<void>;
}

interface RecordingAlignmentProps {
  recording: Recording;
  isEditing: boolean;
  editForm: { transcription?: string; verbatimTranscript?: string };
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  onRefresh?: () => Promise<void>;
}

const RecordingAlignment = forwardRef<RecordingAlignmentHandle, RecordingAlignmentProps>(function RecordingAlignment(
  { recording, isEditing, editForm, setSuccess, setError, onRefresh },
  ref
) {
  const [aligning, setAligning] = useState(false);
  const [alignment, setAlignment] = useState<{
    tokens: Array<{ text: string; startMs: number; endMs: number }>;
    coverage: number;
    message?: string;
  } | null>(null);
  const [activeTokenIndex, setActiveTokenIndex] = useState<number | null>(null);
  const [globalOffsetMs, setGlobalOffsetMs] = useState(0);
  const [alignProcessedSeconds, setAlignProcessedSeconds] = useState<number>(recording.alignmentProgressSeconds || 0);
  const [alignTotalSeconds, setAlignTotalSeconds] = useState<number | undefined>(recording.alignmentProgressTotalSeconds || recording.duration);
  const alignPollingTimerRef = useRef<number | null>(null);

  // Sync local alignment state with recording data
  useEffect(() => {
    if (recording.alignmentItems && recording.alignmentItems.length > 0) {
      const first = recording.alignmentItems[0];
      const tokens = (first.timestamp || [])
        .map((pair, idx) => ({
          text: (first.text || '').split(/\s+/)[idx] || '',
          startMs: Number(pair[0]) || 0,
          endMs: Number(pair[1]) || 0,
        }))
        .filter((t) => t.endMs > t.startMs);
      const totalTokens = Math.max(tokens.length, (first.text || '').split(/\s+/).filter(Boolean).length);
      const coverage = totalTokens > 0 ? Math.round((tokens.length / totalTokens) * 100) : 0;
      setAlignment({ tokens, coverage });
    } else {
      // Clear local state when recording data is reset
      setAlignment(null);
      setActiveTokenIndex(null);
    }
  }, [recording.alignmentItems]);

  const getAudioElement = (): HTMLAudioElement | null => {
    const el = document.querySelector('audio');
    return el instanceof HTMLAudioElement ? el : null;
  };

  useEffect(() => {
    setAlignProcessedSeconds(recording.alignmentProgressSeconds || 0);
    setAlignTotalSeconds(recording.alignmentProgressTotalSeconds || recording.duration);
  }, [recording.alignmentProgressSeconds, recording.alignmentProgressTotalSeconds, recording.duration]);

  const stopAlignPolling = useCallback(() => {
    if (alignPollingTimerRef.current !== null) {
      window.clearInterval(alignPollingTimerRef.current);
      alignPollingTimerRef.current = null;
    }
  }, []);

  const pollAlignProgress = useCallback(async () => {
    try {
      const latest = await apiService.getRecording(recording._id);
      setAlignProcessedSeconds(latest.alignmentProgressSeconds || 0);
      setAlignTotalSeconds(latest.alignmentProgressTotalSeconds || latest.duration);
    } catch {
      // Ignore polling errors and keep waiting for completion
    }
  }, [recording._id]);

  useEffect(() => {
    return () => {
      stopAlignPolling();
    };
  }, [stopAlignPolling]);

  const handleAlign = useCallback(async () => {
    if (!recording) return;

    // Fetch fresh recording data to avoid stale closure issues in pipeline mode
    const freshRecording = await apiService.getRecording(recording._id);
    const text = (isEditing ? editForm.transcription : freshRecording.transcription) || '';
    const cleaned = text
      .replace(/[\p{P}]+/gu, ' ')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) {
      setError('没有可对齐的文本');
      throw new Error('没有可对齐的文本');
    }
    try {
      setAlignment(null);
      setActiveTokenIndex(null);
      setAlignProcessedSeconds(0);
      setAlignTotalSeconds(freshRecording.duration);
      setAligning(true);
      stopAlignPolling();
      alignPollingTimerRef.current = window.setInterval(() => {
        pollAlignProgress();
      }, 1200);
      const result = await apiService.alignRecording(recording._id, cleaned);
      const first = Array.isArray(result.alignments) && result.alignments.length > 0 ? result.alignments[0] : null;
      const tokens = (first?.timestamp || [])
        .map((pair, idx) => ({
          text: (first?.text || '').split(/\s+/)[idx] || '',
          startMs: Number(pair[0]) || 0,
          endMs: Number(pair[1]) || 0,
        }))
        .filter((t) => t.endMs > t.startMs);
      const totalTokens = Math.max(tokens.length, (first?.text || '').split(/\s+/).filter(Boolean).length);
      const coverage = totalTokens > 0 ? Math.round((tokens.length / totalTokens) * 100) : 0;
      setAlignment({ tokens, coverage, message: result.message });
      await pollAlignProgress();
      setSuccess('对齐完成');
      if (onRefresh) await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '对齐失败');
      throw err; // Re-throw for pipeline runner
    } finally {
      stopAlignPolling();
      setAligning(false);
    }
  }, [recording, isEditing, editForm.transcription, setError, setSuccess, onRefresh, pollAlignProgress, stopAlignPolling]);

  const handlePlay = useCallback(() => {
    const audio = getAudioElement();
    if (!audio) {
      setError('未检测到音频播放器');
      return;
    }

    void audio.play().catch((error) => {
      setError(error instanceof Error ? error.message : '播放失败');
    });
  }, [setError]);

  const handlePause = useCallback(() => {
    const audio = getAudioElement();
    if (!audio) {
      setError('未检测到音频播放器');
      return;
    }
    audio.pause();
  }, [setError]);

  const handleStop = useCallback(() => {
    const audio = getAudioElement();
    if (!audio) {
      setError('未检测到音频播放器');
      return;
    }
    audio.pause();
    audio.currentTime = 0;
  }, [setError]);

  // Expose runAlignment to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      runAlignment: handleAlign,
    }),
    [handleAlign]
  );

  useEffect(() => {
    if (!alignment) return;
    const interval = window.setInterval(() => {
      const audio = getAudioElement();
      const nowMs = audio ? audio.currentTime * 1000 : 0;
      const t = nowMs + globalOffsetMs;
      const idx = alignment.tokens.findIndex((tok) => t >= tok.startMs && t < tok.endMs);
      setActiveTokenIndex(idx >= 0 ? idx : null);
    }, 100);
    return () => window.clearInterval(interval);
  }, [alignment, globalOffsetMs]);

  const seekToToken = (index: number) => {
    if (!alignment) return;
    const audio = getAudioElement();
    if (!audio) return;
    const tok = alignment.tokens[index];
    const target = Math.max(0, (tok.startMs - globalOffsetMs) / 1000);
    audio.currentTime = target;
    audio.play();
  };

  const empty = !alignment;
  const coverageVariant: 'default' | 'secondary' | 'destructive' | 'outline' =
    alignment && alignment.coverage >= 80
      ? 'default'
      : alignment && alignment.coverage >= 50
      ? 'secondary'
      : 'destructive';

  const primaryButton = (
    <Button onClick={handleAlign} disabled={aligning || !recording.transcription} size={empty ? 'lg' : 'sm'} variant={empty ? 'default' : 'outline'}>
      {aligning ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          对齐中...
        </>
      ) : (
        <>
          <AlignLeftIcon className="w-4 h-4 mr-2" />
          {empty ? '开始对齐' : '重新对齐'}
        </>
      )}
    </Button>
  );

  return (
    <PipelineStageCard
      icon={<AlignLeftIcon className="w-5 h-5 text-white" />}
      title="对齐"
      description="将转录文本与音频时间轴对齐"
      primaryButton={primaryButton}
      isEmpty={!recording.transcription || (empty && !aligning)}
      emptyIcon={<AlignLeftIcon className="w-12 h-12" />}
      emptyMessage={!recording.transcription ? '需要先生成转录内容，才能进行对齐。' : undefined}
    >
      {(alignment || aligning) && (
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2 text-sm overflow-x-auto sticky top-0 z-10 bg-card py-2 -mx-6 px-6">
            <ButtonGroup className="shrink-0">
              <Button variant="outline" size="icon" className="h-7 w-7" title="播放" onClick={handlePlay} disabled={aligning}>
                <PlayIcon className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" title="暂停" onClick={handlePause} disabled={aligning}>
                <PauseIcon className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" title="停止" onClick={handleStop} disabled={aligning}>
                <SquareIcon className="w-3 h-3" />
              </Button>
            </ButtonGroup>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={coverageVariant} className="shrink-0">
                    {aligning ? '对齐进行中' : `对齐覆盖率: ${alignment?.coverage || 0}%`}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>对齐覆盖率</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge variant="outline" className="shrink-0">{recording.alignmentItems ? '已保存' : '未保存'}</Badge>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <span className="text-muted-foreground">偏移</span>
              <Slider className="w-28" min={-500} max={500} step={10} value={[globalOffsetMs]} onValueChange={(value) => setGlobalOffsetMs(value[0])} />
              <span className="text-muted-foreground">{globalOffsetMs}ms</span>
            </div>
          </div>
          {aligning && (
            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              {typeof alignTotalSeconds === 'number' && alignTotalSeconds > 0
                ? `已处理 ${alignProcessedSeconds.toFixed(1)} / ${alignTotalSeconds.toFixed(1)} 秒`
                : `已处理 ${alignProcessedSeconds.toFixed(1)} 秒`}
            </div>
          )}
          {alignment && (
            <div className="leading-8 bg-muted rounded-lg p-4 font-serif">
              {alignment.tokens.map((tok, idx) => (
                <span
                  key={`${tok.startMs}-${tok.endMs}-${idx}`}
                  onClick={() => seekToToken(idx)}
                  className={`cursor-pointer px-0.5 rounded ${activeTokenIndex === idx ? 'bg-primary/30 text-foreground' : 'hover:bg-primary/10'}`}
                  title={`${Math.round(tok.startMs)}ms - ${Math.round(tok.endMs)}ms`}
                >
                  {tok.text}{' '}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </PipelineStageCard>
  );
});

export default RecordingAlignment;
