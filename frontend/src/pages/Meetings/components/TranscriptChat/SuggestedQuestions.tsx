import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SparklesIcon, RefreshCwIcon } from 'lucide-react';

interface SuggestedQuestionsProps {
  questions: string[];
  onSelectQuestion: (question: string) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

function SuggestedQuestions({ questions, onSelectQuestion, onRefresh, disabled, isLoading }: SuggestedQuestionsProps) {
  return (
    <div className="p-4 border-t border-border bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-foreground">建议问题</p>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={disabled || isLoading}
            className="h-7 px-2"
            title="刷新建议"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-10 w-32" />
          ))
        ) : (
          questions.map((question, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="justify-start text-left h-auto py-2 px-3 whitespace-normal hover:bg-accent/10"
              onClick={() => onSelectQuestion(question)}
              disabled={disabled}
            >
              <span className="text-xs text-muted-foreground">{question}</span>
            </Button>
          ))
        )}
      </div>
    </div>
  );
}

export default SuggestedQuestions;
