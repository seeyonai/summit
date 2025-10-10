import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon, StopCircleIcon } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

function ChatInput({ onSend, onStop, disabled, isStreaming, placeholder = '输入问题...' }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[60px] max-h-[120px] resize-none"
          rows={2}
        />
        {isStreaming ? (
          <Button onClick={onStop} variant="outline" size="icon" className="flex-shrink-0 h-[60px] w-[60px]">
            <StopCircleIcon className="w-5 h-5" />
          </Button>
        ) : (
          <Button onClick={handleSend} disabled={disabled || !message.trim()} size="icon" className="flex-shrink-0 h-[60px] w-[60px]">
            <SendIcon className="w-5 h-5" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        按 Enter 发送，Shift + Enter 换行
      </p>
    </div>
  );
}

export default ChatInput;
