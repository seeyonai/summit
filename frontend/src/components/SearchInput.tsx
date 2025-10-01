import React from 'react';
import { Input } from '@/components/ui/input';
import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string; // wrapper class
  inputClassName?: string; // input element class
  autoFocus?: boolean;
  disabled?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

function SearchInput({
  value,
  onChange,
  placeholder = '搜索...',
  className,
  inputClassName,
  autoFocus,
  disabled,
  onKeyDown
}: SearchInputProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        onKeyDown={onKeyDown}
        className={cn(
          'pl-10 pr-10 h-11 border-border focus:border-primary dark:border-border dark:focus:border-primary transition-colors',
          inputClassName
        )}
      />
      {value && !disabled && (
        <button
          type="button"
          aria-label="清除"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded hover:bg-muted/40 text-muted-foreground"
        >
          <XIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;

