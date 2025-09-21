import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDisputedIssues } from '@/hooks/useDisputedIssues';
import { 
  AlertCircleIcon, 
  TargetIcon, 
  RefreshCwIcon, 
  UsersIcon,
  ClockIcon,
  BrainIcon
} from 'lucide-react';

interface DisputedIssuesProps {
  meetingId: string;
  onAnalysisComplete?: () => void;
}

function DisputedIssues({ meetingId, onAnalysisComplete }: DisputedIssuesProps) {
  const {
    disputedIssues,
    loading,
    error,
    analysisMetadata,
    extractAnalysis,
    clearAnalysis,
  } = useDisputedIssues(meetingId);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleExtractAnalysis = useCallback(async () => {
    setIsProcessing(true);
    await extractAnalysis();
    setIsProcessing(false);
    onAnalysisComplete?.();
  }, [extractAnalysis, onAnalysisComplete]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return severity;
    }
  };

  if (loading || isProcessing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TargetIcon className="w-5 h-5" />
            争论焦点
          </h3>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TargetIcon className="w-5 h-5" />
            争论焦点
          </h3>
          <Button
            onClick={handleExtractAnalysis}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className="w-4 h-4" />
            重试分析
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (disputedIssues.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TargetIcon className="w-5 h-5" />
            争论焦点
          </h3>
          <Button
            onClick={handleExtractAnalysis}
            size="sm"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <BrainIcon className="w-4 h-4" />
            分析争论焦点
          </Button>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TargetIcon className="w-12 h-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              暂无争论焦点
            </h4>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              点击"分析争论焦点"按钮，AI 将从会议记录中提取和分析争论焦点，帮助您了解会议中的关键分歧点。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TargetIcon className="w-5 h-5" />
          争论焦点
          <Badge variant="secondary">{disputedIssues.length}</Badge>
        </h3>
        <div className="flex gap-2">
          {analysisMetadata && (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <ClockIcon className="w-4 h-4" />
              {analysisMetadata.processingTime}
            </div>
          )}
          <Button
            onClick={handleExtractAnalysis}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className="w-4 h-4" />
            重新分析
          </Button>
          <Button
            onClick={clearAnalysis}
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
          >
            清除
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {disputedIssues.map((issue) => (
          <Card key={issue.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-medium flex-1 pr-4">
                  {issue.text}
                </CardTitle>
                <Badge className={getSeverityColor(issue.severity)}>
                  {getSeverityText(issue.severity)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {issue.parties.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <UsersIcon className="w-4 h-4" />
                  <span>涉及方:</span>
                  <div className="flex gap-1 flex-wrap">
                    {issue.parties.map((party, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {party}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default DisputedIssues;