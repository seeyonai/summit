import { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import type { ProofingChatMessage, AlternativeWord, ProofingRequest, CorrectionPair } from '@/types';

interface ProofingEditorProps {
  value: string;
  onChange: (value: string) => void;
  meetingId?: string;
  enabled: boolean;
  className?: string;
  systemContext?: {
    hotwords?: string[];
    speakerNames?: string[];
  };
}

function ProofingEditor({ value, onChange, meetingId, enabled, className, systemContext }: ProofingEditorProps) {
  const [content, setContent] = useState(value);
  const [chatHistory, setChatHistory] = useState<ProofingChatMessage[]>([]);
  const [isProofing, setIsProofing] = useState(false);
  const [alternatives, setAlternatives] = useState<AlternativeWord[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [proofingLineStart, setProofingLineStart] = useState<number | null>(null);
  const [correctionPairs, setCorrectionPairs] = useState<CorrectionPair[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastOriginalInputRef = useRef<string>('');

  // Sync content with parent value
  useEffect(() => {
    setContent(value);
  }, [value]);

  // Parse alternatives from text
  const parseAlternatives = useCallback((text: string): AlternativeWord[] => {
    const alts: AlternativeWord[] = [];
    const regex = /\{([^}]+)\}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const optionsStr = match[1];
      const options = optionsStr.split('|').map((opt) => opt.trim());

      if (options.length > 1) {
        alts.push({
          text: options[0], // First option is default
          options,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    return alts;
  }, []);

  // Get current line text and position
  const getCurrentLine = useCallback(() => {
    if (!textareaRef.current) return null;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;

    // Find start of current line
    let lineStart = cursorPos;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }

    // Find end of current line
    let lineEnd = cursorPos;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }

    const lineText = text.substring(lineStart, lineEnd);

    return {
      text: lineText,
      start: lineStart,
      end: lineEnd,
      cursorPos,
    };
  }, []);

  // Submit current line or selection for correction
  const submitForCorrection = useCallback(async () => {
    if (!enabled || isProofing || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    let textToCorrect = '';
    let replaceStart = 0;
    let replaceEnd = 0;

    // Check if there's a selection
    if (selectionStart !== selectionEnd) {
      // Use selected text
      textToCorrect = textarea.value.substring(selectionStart, selectionEnd);
      replaceStart = selectionStart;
      replaceEnd = selectionEnd;
    } else {
      // Use current line
      const lineInfo = getCurrentLine();
      if (!lineInfo || !lineInfo.text.trim()) {
        // Empty line, just insert newline
        const before = content.substring(0, selectionStart);
        const after = content.substring(selectionEnd);
        const newContent = before + '\n' + after;
        setContent(newContent);
        onChange(newContent);
        // Move cursor to next line
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        }, 0);
        return;
      }

      textToCorrect = lineInfo.text;
      replaceStart = lineInfo.start;
      replaceEnd = lineInfo.end;
    }

    try {
      setIsProofing(true);
      setProofingLineStart(replaceStart);

      // Store original input for potential staging
      lastOriginalInputRef.current = textToCorrect;

      // Build request with delta corrections (only new ones since last request)
      const request: ProofingRequest = {
        input: textToCorrect,
        history: chatHistory.slice(-50), // Last 50 messages
        systemContext: {
          meetingId,
          ...systemContext,
        },
        corrections: correctionPairs.length > 0 ? correctionPairs : undefined,
      };

      // Call API
      const response = await apiService.proofCorrect(request);

      // Reset corrections after sending (delta approach)
      setCorrectionPairs([]);

      // Remove {alternatives} markers and get clean output
      const cleanOutput = response.output.replace(/\{[^}]+\}/g, (match) => {
        // Extract first option from {opt1|opt2|opt3}
        const options = match.substring(1, match.length - 1).split('|');
        return options[0] || match;
      });

      // Save to undo stack
      setUndoStack((prev) => [...prev, content]);

      // Replace text
      const before = content.substring(0, replaceStart);
      const after = content.substring(replaceEnd);
      const newContent = before + cleanOutput + after;

      setContent(newContent);
      onChange(newContent);

      // Parse alternatives for later use
      if (response.alternatives && Object.keys(response.alternatives).length > 0) {
        const alts = parseAlternatives(response.output);
        setAlternatives(alts);
      }

      // Update chat history (immutable append)
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: JSON.stringify({ input: textToCorrect }) },
        { role: 'assistant', content: JSON.stringify({ output: response.output }) },
      ]);

      // Move cursor to end of corrected text
      const newCursorPos = replaceStart + cleanOutput.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
        }
      }, 0);
    } catch (error) {
      console.error('Proofing error:', error);
    } finally {
      setIsProofing(false);
      setProofingLineStart(null);
    }
  }, [
    enabled,
    isProofing,
    content,
    chatHistory,
    meetingId,
    systemContext,
    getCurrentLine,
    onChange,
    parseAlternatives,
  ]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!enabled) return;

      // Enter → Submit for correction
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        submitForCorrection();
        return;
      }

      // Ctrl/Cmd+Enter → Stage manual correction
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();

        const lineInfo = getCurrentLine();
        if (!lineInfo || !lineInfo.text.trim() || !lastOriginalInputRef.current) {
          toast.info('请先提交一行让AI校对后，再使用 Cmd/Ctrl+Enter 暂存手动纠正');
          return;
        }

        // Stage the correction
        const correctionPair: CorrectionPair = {
          original: lastOriginalInputRef.current,
          corrected: lineInfo.text,
        };

        setCorrectionPairs((prev) => [...prev, correctionPair]);
        toast.success(`已暂存纠正 (共${correctionPairs.length + 1}条)`);

        // Clear the reference
        lastOriginalInputRef.current = '';
        return;
      }

      // Shift+Enter → New line (default behavior, no action needed)

      // Ctrl/Cmd+Z → Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (undoStack.length > 0) {
          const previous = undoStack[undoStack.length - 1];
          setUndoStack((prev) => prev.slice(0, -1));
          setContent(previous);
          onChange(previous);
        }
        return;
      }
    },
    [enabled, submitForCorrection, undoStack, onChange, getCurrentLine, correctionPairs.length]
  );

  // Handle content change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setContent(newValue);
      onChange(newValue);
    },
    [onChange]
  );

  // Render content with alternative highlights
  const renderContentWithAlternatives = useCallback(() => {
    if (alternatives.length === 0 || !enabled) {
      return null;
    }

    // Split content into parts with alternatives
    const parts: Array<{ type: 'text' | 'alternative'; content: string; alt?: AlternativeWord }> = [];
    let lastIndex = 0;

    // Sort alternatives by start index
    const sortedAlts = [...alternatives].sort((a, b) => a.startIndex - b.startIndex);

    sortedAlts.forEach((alt) => {
      // Add text before alternative
      if (alt.startIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, alt.startIndex),
        });
      }

      // Add alternative
      parts.push({
        type: 'alternative',
        content: alt.text,
        alt,
      });

      lastIndex = alt.endIndex;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex),
      });
    }

    return parts;
  }, [content, alternatives, enabled]);

  // Handle alternative selection
  const selectAlternative = useCallback(
    (alt: AlternativeWord, selectedOption: string) => {
      // Save to undo stack
      setUndoStack((prev) => [...prev, content]);

      // Replace the alternative with selected option
      const before = content.substring(0, alt.startIndex);
      const after = content.substring(alt.endIndex);
      const newContent = before + selectedOption + after;

      setContent(newContent);
      onChange(newContent);

      // Update alternatives positions
      const offsetDiff = selectedOption.length - (alt.endIndex - alt.startIndex);
      setAlternatives((prev) =>
        prev
          .filter((a) => a.startIndex !== alt.startIndex)
          .map((a) => ({
            ...a,
            startIndex: a.startIndex > alt.startIndex ? a.startIndex + offsetDiff : a.startIndex,
            endIndex: a.endIndex > alt.endIndex ? a.endIndex + offsetDiff : a.endIndex,
          }))
      );
    },
    [content, onChange]
  );

  if (!enabled) {
    return (
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        className={className}
        placeholder="开始书写..."
      />
    );
  }

  const contentParts = renderContentWithAlternatives();

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn(className, isProofing && 'opacity-70 animate-pulse')}
        placeholder="开始书写... (Enter提交AI校对，Cmd/Ctrl+Enter暂存手动纠正，Shift+Enter换行)"
        disabled={isProofing}
      />
      {isProofing && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          校对中...
        </div>
      )}
      {correctionPairs.length > 0 && !isProofing && (
        <div className="absolute top-2 right-2 text-xs text-success bg-success/10 px-2 py-1 rounded border border-success/20">
          已暂存{correctionPairs.length}条纠正
        </div>
      )}
      {/* Alternative overlay */}
      {contentParts && contentParts.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          <div className="relative w-full h-full">
            {contentParts.map((part, index) =>
              part.type === 'alternative' && part.alt ? (
                <Popover key={index}>
                  <PopoverTrigger asChild>
                    <span
                      className="border-b-2 border-dotted border-primary cursor-pointer pointer-events-auto hover:bg-primary/10 transition-colors"
                      style={{ position: 'relative' }}
                    >
                      {part.content}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 max-w-xs">
                    <div className="text-xs text-muted-foreground mb-2">选择备选项：</div>
                    <div className="flex flex-col gap-1">
                      {part.alt.options.map((option, optIndex) => (
                        <Button
                          key={optIndex}
                          variant={optIndex === 0 ? 'default' : 'outline'}
                          size="sm"
                          className="text-left justify-start"
                          onClick={() => selectAlternative(part.alt!, option)}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProofingEditor;
