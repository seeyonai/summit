import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
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
  hasTranscript?: boolean;
  onAnalysisComplete?: () => void;
}

function DisputedIssues({ meetingId, hasTranscript = false, onAnalysisComplete }: DisputedIssuesProps) {
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
        return 'bg-destructive/10 text-destructive border border-destructive/30';
      case 'medium':
        return 'bg-warning/10 text-warning border border-warning/30';
      case 'low':
        return 'bg-info/10 text-info border border-info/30';
      default:
        return 'bg-muted text-muted-foreground border border-border';
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
            className="flex items-center gap-2 bg-gradient-to-r from-chart-4 to-primary hover:from-chart-4/90 hover:to-primary/90 text-white"
          >
            <BrainIcon className="w-4 h-4" />
            分析争论焦点
          </Button>
        </div>
        <Card className="border-dashed">
          <CardContent className="p-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TargetIcon className="w-12 h-12" />
                </EmptyMedia>
                <EmptyTitle>暂无争论焦点</EmptyTitle>
                <EmptyDescription>
                  AI 将从会议记录中提取和分析争论焦点，帮助您了解会议中的关键分歧点。
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  onClick={handleExtractAnalysis}
                  disabled={!hasTranscript}
                >
                  <BrainIcon className="w-4 h-4" />
                  提取争论焦点
                </Button>
              </EmptyContent>
            </Empty>
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
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
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
            className="text-destructive hover:text-destructive"
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
