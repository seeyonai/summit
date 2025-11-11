import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MentionSuggestion } from '@/hooks/useMentions';

interface MentionDropdownProps {
  isOpen: boolean;
  suggestions: MentionSuggestion[];
  selectedIndex: number;
  query: string;
  coords: { top: number; left: number } | null;
  onSelect: (suggestion: MentionSuggestion) => void;
}

function MentionDropdown({
  isOpen,
  suggestions,
  selectedIndex,
  query,
  coords,
  onSelect,
}: MentionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  console.log('[MentionDropdown] Render', { isOpen, suggestions, coords, query });

  // Scroll selected item into view
  useEffect(() => {
    if (dropdownRef.current && selectedIndex >= 0) {
      const selected = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen || !coords || suggestions.length === 0) return null;

  // Highlight matching text in suggestion
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
      <>
        {before}
        <span className="bg-primary/20 text-primary font-medium">{match}</span>
        {after}
      </>
    );
  };

  const renderSuggestionItem = (suggestion: MentionSuggestion, index: number) => {
    const isSelected = index === selectedIndex;
    const displayKey = index < 9 ? (index + 1).toString() : '0';

    return (
      <div
        key={suggestion.id}
        data-index={index}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors whitespace-nowrap',
          'hover:bg-accent',
          isSelected && 'bg-primary text-primary-foreground'
        )}
        onClick={() => onSelect(suggestion)}
      >
        {/* Index Key */}
        <span className="text-xs font-mono opacity-60">{displayKey}</span>

        {/* Display Name */}
        <div className="text-sm font-medium">
          {highlightMatch(suggestion.display, query)}
        </div>

        {/* Secondary Info (alias) */}
        {suggestion.secondary && (
          <div className="text-xs opacity-60">
            {suggestion.secondary}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
    >
      <Card className="px-2 py-1.5 shadow-lg border bg-popover">
        <div className="flex items-center gap-1">
          {/* All suggestions in one row */}
          {suggestions.map((suggestion, idx) => renderSuggestionItem(suggestion, idx))}
        </div>
      </Card>
    </div>
  );
}

export default MentionDropdown;
