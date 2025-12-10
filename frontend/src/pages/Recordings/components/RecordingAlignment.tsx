import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import type { Recording } from '@/types';
import { AlignLeftIcon } from 'lucide-react';
import { apiService } from '@/services/api';
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
      setAligning(true);
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
      setSuccess('对齐完成');
      if (onRefresh) await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '对齐失败');
      throw err; // Re-throw for pipeline runner
    } finally {
      setAligning(false);
    }
  }, [recording, isEditing, editForm.transcription, setError, setSuccess, onRefresh]);

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
      isEmpty={!recording.transcription || empty}
      emptyIcon={<AlignLeftIcon className="w-12 h-12" />}
      emptyMessage={!recording.transcription ? '需要先生成转录内容，才能进行对齐。' : undefined}
    >
      {alignment && (
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant={alignment.coverage >= 80 ? 'default' : alignment.coverage >= 50 ? 'secondary' : 'destructive'}>
              对齐覆盖率: {alignment.coverage}%
            </Badge>
            <Badge variant="outline">{recording.alignmentItems ? '已保存' : '未保存'}</Badge>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">时间偏移</span>
              <Slider
                className="w-36"
                min={-500}
                max={500}
                step={10}
                value={[globalOffsetMs]}
                onValueChange={(value) => setGlobalOffsetMs(value[0])}
              />
              <span className="text-muted-foreground">{globalOffsetMs}ms</span>
            </div>
          </div>
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
        </div>
      )}
    </PipelineStageCard>
  );
});

export default RecordingAlignment;
