import type { ReactNode } from 'react';
import { useAnalysisResult } from '@/hooks/useAnalysisResult';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Loader2, BrainIcon, AlertCircleIcon, RefreshCwIcon } from 'lucide-react';
import type { Meeting, DisputedIssue, Todo } from '@/types/index';

interface MeetingAnaylysisProps {
  meeting: Meeting & { _id: string };
  children: (data: {
    disputedIssues: DisputedIssue[];
    todos: Todo[];
  }) => ReactNode;
}

function MeetingAnalysis({ meeting, children }: MeetingAnaylysisProps) {
  const { AnalysisResult, loading, error, extractAnalysis } = useAnalysisResult(meeting._id, {disputedIssues: meeting.disputedIssues || [], todos: meeting.todos || []});

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">正在分析会议记录...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={extractAnalysis}>
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!AnalysisResult) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BrainIcon />
          </EmptyMedia>
          <EmptyTitle>暂无分析结果</EmptyTitle>
          <EmptyDescription>
            使用 AI 分析从会议记录中提取争议问题和待办事项。
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={extractAnalysis}>
            <BrainIcon className="mr-2 h-4 w-4" />
            提取分析
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={extractAnalysis} disabled={loading}>
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          重新分析
        </Button>
      </div>
      {children({
        disputedIssues: AnalysisResult.data.disputedIssues,
        todos: AnalysisResult.data.todos,
      })}
    </div>
  );
}

export default MeetingAnalysis;
