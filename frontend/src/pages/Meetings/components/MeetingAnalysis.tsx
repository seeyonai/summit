import type { ReactNode } from 'react';
import { useAnalysisResult } from '@/hooks/useAnalysisResult';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Loader2, BrainIcon, AlertCircleIcon, RefreshCwIcon, Trash2, ChevronDown } from 'lucide-react';
import type { Meeting, DisputedIssue, Todo } from '@/types/index';
import { useState, useRef, useEffect } from 'react';

interface MeetingAnaylysisProps {
  meeting: Meeting & { _id: string };
  children: (data: { disputedIssues: DisputedIssue[]; todos: Todo[] }) => ReactNode;
  isViewerOnly?: boolean;
}

function MeetingAnalysis({ meeting, children, isViewerOnly = false }: MeetingAnaylysisProps) {
  const { analysisResult, loading, error, extractAnalysis, clearAnalysis, clearDisputedIssues, clearTodos } = useAnalysisResult(meeting._id, {
    disputedIssues: meeting.disputedIssues,
    todos: meeting.todos,
  });
  const [showClearMenu, setShowClearMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClearMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClearAll = () => {
    clearAnalysis();
    setShowClearMenu(false);
  };

  const handleClearDisputedIssues = () => {
    clearDisputedIssues();
    setShowClearMenu(false);
  };

  const handleClearTodos = () => {
    clearTodos();
    setShowClearMenu(false);
  };

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

  const empty =
    !analysisResult || !analysisResult.data || !Array.isArray(analysisResult.data.disputedIssues) || !Array.isArray(analysisResult.data.todos);

  if (empty) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BrainIcon />
          </EmptyMedia>
          <EmptyTitle>暂无分析结果</EmptyTitle>
          <EmptyDescription>{isViewerOnly ? 'AI 分析尚未生成' : '使用 AI 分析从会议记录中提取争议问题和待办事项。'}</EmptyDescription>
        </EmptyHeader>
        {!isViewerOnly && (
          <EmptyContent>
            <Button onClick={extractAnalysis}>
              <BrainIcon className="mr-2 h-4 w-4" />
              提取分析
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {analysisResult!.data.disputedIssues?.length} 争议, {analysisResult!.data.todos?.length} 待办
          </span>
        </div>
        {!isViewerOnly && (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={extractAnalysis} disabled={loading}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              重新分析
            </Button>
            <div className="relative" ref={dropdownRef}>
              <Button variant="outline" size="sm" onClick={() => setShowClearMenu(!showClearMenu)}>
                <Trash2 className="mr-2 h-4 w-4" />
                清除
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              {showClearMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={handleClearAll}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      清除全部
                    </button>
                    <button
                      onClick={handleClearDisputedIssues}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                    >
                      <AlertCircleIcon className="mr-2 h-4 w-4" />
                      清除争议问题
                    </button>
                    <button
                      onClick={handleClearTodos}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                    >
                      <BrainIcon className="mr-2 h-4 w-4" />
                      清除待办事项
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {children({
        disputedIssues: analysisResult!.data.disputedIssues,
        todos: analysisResult!.data.todos,
      })}
    </div>
  );
}

export default MeetingAnalysis;
