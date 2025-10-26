import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatLoadingMessage from './ChatLoadingMessage';
import SuggestedQuestions from './SuggestedQuestions';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { MessageSquareIcon, SparklesIcon } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  isWaitingForFirstToken?: boolean;
  streamingContent?: string;
  suggestedQuestions?: string[];
  isLoadingQuestions?: boolean;
  onSelectSuggestedQuestion?: (question: string) => void;
  onRefreshQuestions?: () => void;
  onRegenerateMessage?: () => void;
}

function ChatMessageList({ messages, isStreaming, isWaitingForFirstToken, streamingContent, suggestedQuestions = [], isLoadingQuestions, onSelectSuggestedQuestion, onRefreshQuestions, onRegenerateMessage }: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const shouldShowLoadingMessage = isWaitingForFirstToken && !streamingContent;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, isWaitingForFirstToken]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquareIcon className="w-12 h-12" />
              </EmptyMedia>
              <EmptyTitle>开始对话</EmptyTitle>
              <EmptyDescription>
                向我提问关于这次会议的任何问题
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  选择下方的建议问题开始
                </p>
              </div>
            </EmptyContent>
          </Empty>
        </div>
        {onSelectSuggestedQuestion && (
          <div className="overflow-y-auto max-h-[40vh]">
            <SuggestedQuestions
              questions={suggestedQuestions}
              onSelectQuestion={onSelectSuggestedQuestion}
              onRefresh={onRefreshQuestions}
              disabled={isStreaming}
              isLoading={isLoadingQuestions}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, idx) => {
        const isLastAssistantMessage = msg.role === 'assistant' && idx === messages.length - 1;
        return (
          <ChatMessage
            key={idx}
            role={msg.role}
            content={msg.content}
            onRegenerate={isLastAssistantMessage ? onRegenerateMessage : undefined}
          />
        );
      })}
      {shouldShowLoadingMessage && <ChatLoadingMessage />}
      {isStreaming && streamingContent && (
        <ChatMessage role="assistant" content={streamingContent} isStreaming showActions={false} />
      )}
      <div ref={endRef} />
    </div>
  );
}

export default ChatMessageList;
