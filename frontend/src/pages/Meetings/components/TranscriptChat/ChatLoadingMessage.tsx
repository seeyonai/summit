import { BotIcon } from 'lucide-react';

function ChatLoadingMessage() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <BotIcon className="w-4 h-4 text-primary" />
      </div>
      <div className="max-w-[80%]">
        <div className="rounded-lg px-4 py-3 bg-muted">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatLoadingMessage;
