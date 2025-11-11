import { useState, useRef, useCallback, useEffect } from 'react';

export interface MentionUser {
  _id: string;
  name: string;
  aliases?: string[];
  email?: string;
}

export interface MentionSuggestion {
  id: string;
  display: string;
  secondary?: string;
  type: 'user' | 'speaker' | 'hotword' | 'tag';
}

export interface MentionContext {
  users?: MentionUser[];
  speakers?: string[];
  hotwords?: string[];
  tags?: string[];
}

interface UseMentionsOptions {
  value: string;
  onChange: (value: string) => void;
  context?: MentionContext;
  enabled?: boolean;
}

interface MentionState {
  isOpen: boolean;
  query: string;
  triggerIndex: number;
  triggerChar: '@' | '#';
  cursorCoords: { top: number; left: number } | null;
}

export function useMentions({ value, onChange, context, enabled = true }: UseMentionsOptions) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: '',
    triggerIndex: -1,
    triggerChar: '@',
    cursorCoords: null,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Calculate cursor coordinates for popover positioning
  const getCursorCoordinates = useCallback((element: HTMLTextAreaElement, position: number) => {
    const cursorPos = position;
    const textBeforeCursor = element.value.slice(0, cursorPos);

    // Create a mirror div to measure text
    const mirror = document.createElement('div');
    const computed = window.getComputedStyle(element);

    // Copy styles from textarea to mirror
    mirror.style.font = computed.font;
    mirror.style.padding = computed.padding;
    mirror.style.border = computed.border;
    mirror.style.lineHeight = computed.lineHeight;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.top = '0';
    mirror.style.left = '0';
    mirror.style.width = `${element.clientWidth}px`;
    mirror.textContent = textBeforeCursor;

    // Add a span at the end to get cursor position
    const span = document.createElement('span');
    span.textContent = '|';
    mirror.appendChild(span);

    document.body.appendChild(mirror);

    const spanRect = span.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    document.body.removeChild(mirror);

    // Calculate position relative to textarea
    const relativeTop = spanRect.top - mirrorRect.top;
    const relativeLeft = spanRect.left - mirrorRect.left;

    return {
      top: relativeTop + spanRect.height - element.scrollTop,
      left: relativeLeft,
    };
  }, []);

  // Build suggestions from context
  const getSuggestions = useCallback((): MentionSuggestion[] => {
    if (!context) return [];

    const suggestions: MentionSuggestion[] = [];
    const query = mentionState.query.toLowerCase();

    // Only show suggestions matching the trigger type
    if (mentionState.triggerChar === '@') {
      // Add users
      if (context.users) {
        context.users.forEach(user => {
          const nameMatch = user.name.toLowerCase().includes(query);
          const aliasMatch = user.aliases?.some(a => a.toLowerCase().includes(query));

          if (nameMatch || aliasMatch || !query) {
            const matchedAlias = user.aliases?.find(a => a.toLowerCase().includes(query));
            suggestions.push({
              id: `user-${user._id}`,
              display: user.name,
              secondary: user.aliases && user.aliases.length > 0 ? `(${user.aliases[0]})` : undefined,
              type: 'user',
            });
          }
        });
      }

      // Add speakers
      if (context.speakers) {
        context.speakers.forEach((speaker, idx) => {
          if (speaker.toLowerCase().includes(query) || !query) {
            suggestions.push({
              id: `speaker-${idx}`,
              display: speaker,
              type: 'speaker',
            });
          }
        });
      }

      // Add hotwords
      if (context.hotwords) {
        context.hotwords.forEach((hotword, idx) => {
          if (hotword.toLowerCase().includes(query) || !query) {
            suggestions.push({
              id: `hotword-${idx}`,
              display: hotword,
              type: 'hotword',
            });
          }
        });
      }
    } else if (mentionState.triggerChar === '#') {
      // Add tags only
      if (context.tags) {
        context.tags.forEach((tag, idx) => {
          if (tag.toLowerCase().includes(query) || !query) {
            suggestions.push({
              id: `tag-${idx}`,
              display: tag,
              type: 'tag',
            });
          }
        });
      }
    }

    return suggestions;
  }, [context, mentionState.query, mentionState.triggerChar]);

  const suggestions = getSuggestions();

  // Handle textarea input changes
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    console.log('[useMentions] handleInput called', { newValue, cursorPos, enabled });

    onChange(newValue);

    if (!enabled) {
      console.log('[useMentions] Mention feature is disabled');
      return;
    }

    // Check if we're typing after @ or # symbol
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');

    console.log('[useMentions] Text before cursor:', textBeforeCursor);
    console.log('[useMentions] Last @ index:', lastAtIndex, 'Last # index:', lastHashIndex);

    // Determine which trigger is more recent
    let triggerChar: '@' | '#' | null = null;
    let triggerIndex = -1;

    if (lastAtIndex > lastHashIndex) {
      triggerChar = '@';
      triggerIndex = lastAtIndex;
    } else if (lastHashIndex !== -1) {
      triggerChar = '#';
      triggerIndex = lastHashIndex;
    }

    if (triggerChar && triggerIndex !== -1) {
      const textAfterTrigger = textBeforeCursor.substring(triggerIndex + 1);

      console.log(`[useMentions] Text after ${triggerChar}:`, textAfterTrigger);

      // Check if there's a space after trigger (which means mention should close)
      if (textAfterTrigger.includes(' ') || textAfterTrigger.includes('\n')) {
        console.log('[useMentions] Space/newline found, closing mention');
        setMentionState({
          isOpen: false,
          query: '',
          triggerIndex: -1,
          triggerChar: '@',
          cursorCoords: null,
        });
        return;
      }

      // Open mention dropdown
      const coords = getCursorCoordinates(e.target, triggerIndex);
      console.log(`[useMentions] Opening ${triggerChar} dropdown`, { coords, query: textAfterTrigger });
      setMentionState({
        isOpen: true,
        query: textAfterTrigger,
        triggerIndex,
        triggerChar,
        cursorCoords: coords,
      });
      setSelectedIndex(0);
    } else {
      console.log('[useMentions] No trigger found, closing mention');
      setMentionState({
        isOpen: false,
        query: '',
        triggerIndex: -1,
        triggerChar: '@',
        cursorCoords: null,
      });
    }
  }, [onChange, enabled, getCursorCoordinates]);

  // Handle mention selection
  const handleSelect = useCallback((suggestion: MentionSuggestion) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const { triggerIndex } = mentionState;

    if (triggerIndex === -1) return;

    const beforeMention = value.substring(0, triggerIndex);
    const afterMention = value.substring(textarea.selectionStart);

    // For tags, display already includes #, so just use it directly
    // For others, prepend @
    const insertText = suggestion.type === 'tag'
      ? suggestion.display  // '#todo' already includes #
      : `@${suggestion.display}`;  // '@UserName'

    const newValue = beforeMention + insertText + afterMention;
    const newCursorPos = beforeMention.length + insertText.length;

    onChange(newValue);

    // Close dropdown
    setMentionState({
      isOpen: false,
      query: '',
      triggerIndex: -1,
      triggerChar: '@',
      cursorCoords: null,
    });

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange, mentionState]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionState.isOpen) return;

    const suggestionCount = suggestions.length;

    // Number keys 1-9 and 0 for quick selection
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[index]);
      }
      return;
    }

    if (e.key === '0') {
      const index = 9; // 0 maps to 10th item
      if (index < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[index]);
      }
      return;
    }

    // Left/Right arrow navigation
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestionCount);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestionCount) % suggestionCount);
      return;
    }

    // Enter to select
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
      return;
    }

    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      setMentionState({
        isOpen: false,
        query: '',
        triggerIndex: -1,
        triggerChar: '@',
        cursorCoords: null,
      });
      return;
    }
  }, [mentionState.isOpen, suggestions, selectedIndex, handleSelect]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionState.query]);

  return {
    textareaRef,
    mentionState,
    suggestions: suggestions.slice(0, 10), // Max 10 items (1-9, 0)
    selectedIndex,
    handleSelect,
    textareaProps: {
      ref: textareaRef,
      onChange: handleInput,
      onKeyDown: handleKeyDown,
    },
  };
}
