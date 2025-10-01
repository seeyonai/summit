import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Copy, CheckCheck } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import type { Recording } from '@base/types';

interface TranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  recordings: Recording[];
  showCombinedRecording?: boolean;
  combinedRecording?: Recording;
}

function TranscriptDialog({
  open,
  onOpenChange,
  title,
  recordings,
  showCombinedRecording,
  combinedRecording,
}: TranscriptDialogProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const recordingsToShow = useMemo(() =>
    showCombinedRecording && combinedRecording
      ? [combinedRecording]
      : recordings, [showCombinedRecording, combinedRecording, recordings]);

  const handleCopy = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success('转录内容已复制到剪贴板');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('复制失败');
    }
  }, []);

  const handleDownload = useCallback(() => {
    const allTranscriptions = recordingsToShow
      .filter(r => r.transcription)
      .map(r => `=== ${showCombinedRecording ? '合并录音' : r.filename} ===\n\n${r.transcription}`)
      .join('\n\n' + '='.repeat(50) + '\n\n');

    const blob = new Blob([allTranscriptions], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}-转录.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('转录内容已下载');
  }, [recordingsToShow, showCombinedRecording, title]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100/20 to-blue-100/20">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">会议完整转录</DialogTitle>
                <DialogDescription className="mt-1">
                  {title} 的完整转录内容
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
            >
              <Download className="w-4 h-4" />
              下载
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {recordingsToShow.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">暂无转录内容</p>
            </div>
          ) : (
            recordingsToShow.map((recording, index) => (
              recording.transcription && (
                <div
                  key={showCombinedRecording ? 'combined' : index}
                  className="space-y-3 animate-in fade-in-50 slide-in-from-bottom-2"
                >
                  <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      {showCombinedRecording ? '合并录音' : recording.filename}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(recording.transcription || '', index)}
                      className="gap-1.5 text-xs hover:bg-blue-50 hover:text-blue-700"
                    >
                      {copiedIndex === index ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-green-600" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          复制
                        </>
                      )}
                    </Button>
                  </div>
                  <div className={cn(
                    'p-4 rounded-lg bg-gradient-to-br from-gray-50/20 to-slate-50/20',
                    'border border-gray-200/50 shadow-sm'
                  )}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
                      {recording.transcription}
                    </p>
                  </div>
                </div>
              )
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TranscriptDialog;
