import { Badge } from '@/components/ui/badge';
import type { DisputedIssue } from '@/types/index';

interface DisputedIssuesProps {
  disputedIssues: DisputedIssue[];
}

function DisputedIssues({ disputedIssues }: DisputedIssuesProps) {

  const getSeverityColor = (severity?: string | null) => {
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

  const getSeverityText = (severity?: string | null) => {
    switch (severity) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return severity || '未知';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {disputedIssues.map((issue, index) => (
          <div key={issue.id || index} className="hover:shadow-md transition-shadow">
            <div className="pb-3">
              <div className="text-base font-medium mb-2">
                {issue.text}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {issue.severity && (
                  <Badge className={getSeverityColor(issue.severity)}>
                    严重程度: {getSeverityText(issue.severity)}
                  </Badge>
                )}

                {issue.parties && (
                  <Badge variant="outline">
                    相关方: {issue.parties}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DisputedIssues;
