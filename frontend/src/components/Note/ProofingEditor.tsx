import { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import type { ProofingChatMessage, ProofingRequest, CorrectionPair } from '@/types';

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
  const [chatHistory, setChatHistory] = useState<ProofingChatMessage[]>([]);
  const [isProofing, setIsProofing] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [correctionPairs, setCorrectionPairs] = useState<CorrectionPair[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastOriginalInputRef = useRef<string>('');
  const pendingCorrectionsRef = useRef<number>(0);

  // Sync textarea value from parent (only when parent changes)
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== value) {
      textareaRef.current.value = value;
    }
  }, [value]);

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
  const submitForCorrection = useCallback(
    async (currentContent: string) => {
      if (!enabled || !textareaRef.current) return;

      const textarea = textareaRef.current;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;

      let textToCorrect = '';
      let replaceStart = 0;
      let replaceEnd = 0;

      // Check if there's a selection
      if (selectionStart !== selectionEnd) {
        // Use selected text
        textToCorrect = currentContent.substring(selectionStart, selectionEnd);
        replaceStart = selectionStart;
        replaceEnd = selectionEnd;
      } else {
        // Find the line that was just completed (before the newline was added)
        const lines = currentContent.substring(0, selectionStart).split('\n');
        const lastLine = lines[lines.length - 2]; // -2 because -1 is the empty new line

        if (!lastLine || !lastLine.trim()) {
          return; // Empty line, nothing to correct
        }

        textToCorrect = lastLine;
        // Calculate position of the last line
        const beforeLastLine = lines.slice(0, -2).join('\n');
        replaceStart = beforeLastLine.length + (beforeLastLine.length > 0 ? 1 : 0);
        replaceEnd = replaceStart + lastLine.length;
      }

      // Store original input for potential staging
      lastOriginalInputRef.current = textToCorrect;

      // Track pending correction
      pendingCorrectionsRef.current += 1;
      setIsProofing(true);

      try {
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

        // Update chat history (immutable append)
        setChatHistory((prev) => [
          ...prev,
          { role: 'user', content: JSON.stringify({ input: textToCorrect }) },
          { role: 'assistant', content: JSON.stringify({ output: response.output }) },
        ]);

        // Apply correction based on CURRENT textarea content, not stale content
        if (textareaRef.current) {
          const currentTextareaContent = textareaRef.current.value;
          
          // Find the original text in current content
          const originalIndex = currentTextareaContent.indexOf(textToCorrect);
          
          if (originalIndex !== -1) {
            // Save to undo stack before modifying
            setUndoStack((prev) => [...prev, currentTextareaContent]);
            
            // Replace the original text with corrected text
            const before = currentTextareaContent.substring(0, originalIndex);
            const after = currentTextareaContent.substring(originalIndex + textToCorrect.length);
            const finalContent = before + cleanOutput + after;
            
            // Store current cursor position
            const currentPos = textareaRef.current.selectionStart;
            
            // Update textarea value directly
            textareaRef.current.value = finalContent;
            
            // Adjust cursor position if it's after the corrected text
            const lengthDiff = cleanOutput.length - textToCorrect.length;
            if (lengthDiff !== 0 && currentPos > originalIndex) {
              const adjustedPos = currentPos + lengthDiff;
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = adjustedPos;
            }
            
            // Notify parent of change
            onChange(finalContent);
          }
        }
      } catch (error) {
        console.error('Proofing error:', error);
      } finally {
        pendingCorrectionsRef.current -= 1;
        if (pendingCorrectionsRef.current === 0) {
          setIsProofing(false);
        }
      }
    },
    [enabled, chatHistory, meetingId, systemContext, onChange, correctionPairs]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!enabled) return;

      // Enter → Let default behavior add newline, then submit for correction
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Don't prevent default - let the newline be added naturally
        setTimeout(() => {
          if (textareaRef.current) {
            submitForCorrection(textareaRef.current.value);
          }
        }, 0);
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
        if (undoStack.length > 0 && textareaRef.current) {
          const previous = undoStack[undoStack.length - 1];
          setUndoStack((prev) => prev.slice(0, -1));
          textareaRef.current.value = previous;
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
      onChange(e.target.value);
    },
    [onChange]
  );

  if (!enabled) {
    return <Textarea ref={textareaRef} defaultValue={value} onChange={handleChange} className={className} placeholder="开始书写..." />;
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        defaultValue={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn(className, isProofing && 'opacity-70 animate-pulse')}
        placeholder="开始书写... (Enter提交AI校对，Cmd/Ctrl+Enter暂存手动纠正，Shift+Enter换行)"
      />
      {isProofing && <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">校对中...</div>}
      {correctionPairs.length > 0 && !isProofing && (
        <div className="absolute top-2 right-2 text-xs text-success bg-success/10 px-2 py-1 rounded border border-success/20">
          已暂存{correctionPairs.length}条纠正
        </div>
      )}
    </div>
  );
}

export default ProofingEditor;
