import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BrainIcon, CheckCircleIcon, Loader2 } from 'lucide-react';
import type { AnalysisProgress } from '@/hooks/useAnalysisResult';

interface AnalysisProgressDialogProps {
  loading: boolean;
  progress: AnalysisProgress | null;
  error: string | null;
  onAbort: () => void;
}

function AnalysisProgressDialog({ loading, progress, error, onAbort }: AnalysisProgressDialogProps) {
  const [visible, setVisible] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const prevLoadingRef = useRef(loading);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const percentHighRef = useRef(0);
  const chunkHighRef = useRef(0);

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;

    if (loading && !wasLoading) {
      // Loading just started — open dialog
      setShowComplete(false);
      setVisible(true);
      percentHighRef.current = 0;
      chunkHighRef.current = 0;
      if (timerRef.current) clearTimeout(timerRef.current);
    } else if (!loading && wasLoading && !error) {
      // Loading just finished successfully — show completion briefly
      setShowComplete(true);
      timerRef.current = setTimeout(() => {
        setShowComplete(false);
        setVisible(false);
      }, 1200);
    } else if (!loading && wasLoading && error) {
      // Loading finished with error — close immediately
      setShowComplete(false);
      setVisible(false);
    }
  }, [loading, error]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const isReduction = progress?.stage === 'reduction';
  const chunkCount = progress?.chunkCount || 0;
  const rawChunkDone = progress?.stage === 'chunk' && progress?.status === 'done'
    ? (progress.chunkIndex ?? -1) + 1
    : progress?.stage === 'chunk' && progress?.status === 'start'
      ? (progress.chunkIndex ?? 0)
      : 0;

  // Never let displayed values go backward
  if (rawChunkDone > chunkHighRef.current) {
    chunkHighRef.current = rawChunkDone;
  }
  const chunkDone = chunkHighRef.current;

  let rawPercent = 0;
  if (showComplete) {
    rawPercent = 100;
  } else if (isReduction) {
    rawPercent = progress?.status === 'done' ? 100 : 90;
  } else if (chunkCount > 0) {
    rawPercent = Math.round((chunkDone / chunkCount) * 85);
  }

  if (rawPercent > percentHighRef.current) {
    percentHighRef.current = rawPercent;
  }
  const percent = percentHighRef.current;

  const statusText = showComplete
    ? '分析完成'
    : isReduction
      ? '正在合并结果...'
      : chunkCount > 0
        ? `正在提取 ${chunkDone}/${chunkCount} 段...`
        : '正在准备分析...';

  return (
    <Dialog open={visible} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button:last-child]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainIcon className="h-5 w-5 text-primary" />
            AI 分析
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <Progress value={percent} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                {showComplete ? (
                  <CheckCircleIcon className="h-4 w-4 text-success" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {statusText}
              </span>
              {percent > 0 && (
                <span className="text-muted-foreground tabular-nums">{percent}%</span>
              )}
            </div>
          </div>
          {!showComplete && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onAbort}>
                取消
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AnalysisProgressDialog;
