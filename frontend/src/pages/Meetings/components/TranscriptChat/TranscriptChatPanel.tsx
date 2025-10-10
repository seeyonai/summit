import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RotateCcwIcon } from 'lucide-react';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import { useTranscriptChat } from '@/hooks/useTranscriptChat';

interface TranscriptChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingTitle: string;
}

function TranscriptChatPanel({ open, onOpenChange, meetingId, meetingTitle }: TranscriptChatPanelProps) {
  const { messages, isStreaming, isWaitingForFirstToken, streamingContent, suggestedQuestions, isLoadingQuestions, sendMessage, stopStreaming, clearHistory, regenerateLastMessage, refreshSuggestedQuestions } = useTranscriptChat(meetingId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] p-0 flex flex-col">
        <SheetHeader className="pl-6 pr-2 py-6 border-b border-border">
          <div className="flex items-end justify-between">
            <div>
              <SheetTitle>与记录对话</SheetTitle>
              <SheetDescription>{meetingTitle}</SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button variant="secondary" size="sm" onClick={clearHistory}>
                  <RotateCcwIcon className="w-3 h-3" />
                  清空对话
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ChatMessageList
          messages={messages}
          isStreaming={isStreaming}
          isWaitingForFirstToken={isWaitingForFirstToken}
          streamingContent={streamingContent}
          suggestedQuestions={suggestedQuestions}
          isLoadingQuestions={isLoadingQuestions}
          onSelectSuggestedQuestion={sendMessage}
          onRefreshQuestions={refreshSuggestedQuestions}
          onRegenerateMessage={regenerateLastMessage}
        />

        <ChatInput onSend={sendMessage} onStop={stopStreaming} disabled={isStreaming} isStreaming={isStreaming} />
      </SheetContent>
    </Sheet>
  );
}

export default TranscriptChatPanel;
