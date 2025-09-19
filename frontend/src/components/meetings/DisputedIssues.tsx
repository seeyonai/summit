import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Brain, MessageSquare, TrendingUp, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DisputedIssue {
  id?: string;
  text: string;
}

interface DisputedIssuesProps {
  issues: DisputedIssue[];
  onAnalyze?: (issue: DisputedIssue) => void;
  className?: string;
}

function DisputedIssues({ issues, onAnalyze, className }: DisputedIssuesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id || 'temp');
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  }, []);

  if (!issues || issues.length === 0) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">暂无争议焦点</p>
          <p className="text-xs text-muted-foreground mt-1">会议进行顺利</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-orange-50/20 to-amber-50/20 border-b">
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-100/20">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          争议焦点
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {issues.length} 个待解决
          </span>
        </CardTitle>
        <CardDescription>会议中需要重点关注和解决的争议点</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {issues.map((issue, index) => (
            <div
              key={issue.id || index}
              className="group p-4 transition-all hover:bg-gradient-to-r hover:from-orange-50/20 hover:to-amber-50/20"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100/20 to-amber-100/20 flex items-center justify-center">
                    <span className="text-xs font-semibold text-orange-700">{index + 1}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed text-foreground/90 break-words">
                    {issue.text}
                  </p>
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(issue.text, issue.id)}
                      className="h-8 text-xs gap-1.5 hover:bg-white/80"
                    >
                      {copiedId === issue.id ? (
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
                    {onAnalyze && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAnalyze(issue)}
                        className="h-8 text-xs gap-1.5 hover:bg-white/80"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        AI 分析
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default DisputedIssues;
