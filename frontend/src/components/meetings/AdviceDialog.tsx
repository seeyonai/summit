import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy, CheckCheck, Lightbulb, RefreshCw } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todoText?: string;
  advice?: string;
  loading?: boolean;
  onRegenerate?: () => void;
}

function AdviceDialog({
  open,
  onOpenChange,
  todoText,
  advice,
  loading,
  onRegenerate,
}: AdviceDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!advice) return;
    
    try {
      await navigator.clipboard.writeText(advice);
      setCopied(true);
      toast.success('建议已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  }, [advice]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b bg-gradient-to-r from-purple-500/5 to-pink-500/5 -m-6 mb-0 p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 shadow-sm">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">AI 智能建议</DialogTitle>
              <DialogDescription className="mt-1">
                基于任务内容生成的智能化执行建议
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {todoText && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Lightbulb className="w-4 h-4" />
                原始任务
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/5 border border-primary/20">
                <p className="text-sm text-gray-700">{todoText}</p>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 animate-pulse" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-purple-500 animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">
                AI 正在分析并生成建议...
              </p>
            </div>
          ) : advice ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI 建议
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1.5 text-xs hover:bg-primary/5 hover:text-purple-700"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        复制
                      </>
                    )}
                  </Button>
                  {onRegenerate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRegenerate}
                      className="gap-1.5 text-xs hover:bg-primary/5 hover:text-purple-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      重新生成
                    </Button>
                  )}
                </div>
              </div>
              <div className={cn(
                'p-4 rounded-lg bg-gradient-to-br from-purple-500/5 to-pink-500/5',
                'border border-purple-500/20 shadow-sm'
              )}>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
                    {advice}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-700 space-y-1">
                    <p className="font-medium">提示：</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-600">
                      <li>建议仅供参考，请根据实际情况调整</li>
                      <li>可以点击"重新生成"获取不同角度的建议</li>
                      <li>复制建议后可以在其他地方使用</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-full bg-gradient-to-br from-muted/20 to-muted/20 mb-4">
                <Sparkles className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground">暂无建议内容</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdviceDialog;
