import { useState } from 'react';
import { UserIcon, BotIcon, CopyIcon, RefreshCwIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnnotatedMarkdown from '@/components/AnnotatedMarkdown';
import { toast } from 'sonner';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  showActions?: boolean;
}

function ChatMessage({ role, content, isStreaming, onCopy, onRegenerate, showActions = true }: ChatMessageProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch (error) {
      toast.error('复制失败');
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BotIcon className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div className={`rounded-lg px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <AnnotatedMarkdown content={content} />
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-current ml-1 animate-pulse" />
              )}
            </div>
          )}
        </div>
        {!isUser && !isStreaming && showActions && (
          <div className="flex items-center gap-1 mt-1.5 ml-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3 h-3 mr-1" />
                  已复制
                </>
              ) : (
                <>
                  <CopyIcon className="w-3 h-3 mr-1" />
                  复制
                </>
              )}
            </Button>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10"
              >
                <RefreshCwIcon className="w-3 h-3 mr-1" />
                重新生成
              </Button>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-4 h-4 text-foreground" />
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
