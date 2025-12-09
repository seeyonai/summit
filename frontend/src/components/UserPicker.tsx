import React, { useEffect, useState } from 'react';
import SearchInput from '@/components/SearchInput';
import { searchUsers, type UserListItem } from '@/services/users';
import { cn } from '@/lib/utils';
import { CheckIcon, UserIcon } from 'lucide-react';

interface MarkedUser {
  userId: string;
  label: string;
}

interface UserPickerProps {
  placeholder?: string;
  excludeUserIds?: string[];
  markedUsers?: MarkedUser[];
  onSelect: (user: UserListItem) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}

function UserPicker({
  placeholder = '通过邮箱/姓名搜索用户',
  excludeUserIds = [],
  markedUsers = [],
  onSelect,
  className,
  disabled = false,
}: UserPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const excludeSet = new Set(excludeUserIds);
  const markedMap = new Map(markedUsers.map((m) => [m.userId, m.label]));

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const list = await searchUsers(query.trim());
        if (active) {
          setResults(list);
          setLoading(false);
        }
      } catch {
        if (active) {
          setResults([]);
          setLoading(false);
        }
      }
    };
    const timer = setTimeout(run, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = async (user: UserListItem) => {
    setSelecting(true);
    try {
      await onSelect(user);
      setQuery('');
      setResults([]);
    } finally {
      setSelecting(false);
    }
  };

  // Don't filter out excluded users, show all results
  const displayResults = results.filter((u) => !excludeSet.has(u._id));

  return (
    <div className={cn('relative', className)}>
      <SearchInput placeholder={placeholder} value={query} onChange={setQuery} disabled={disabled || selecting} />

      {query && (
        <div className="absolute z-50 w-full mt-2 border rounded-lg bg-background shadow-lg max-h-80 overflow-auto">
          {loading && <div className="p-4 text-center text-sm text-muted-foreground">搜索中...</div>}

          {!loading && displayResults.length === 0 && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">无匹配结果</div>
          )}

          {!loading && (displayResults.length > 0 || results.length > 0) && (
            <div className="py-1">
              {results.map((user) => {
                const isExcluded = excludeSet.has(user._id);
                const markedLabel = markedMap.get(user._id);
                const isMarked = !!markedLabel;
                const isDisabled = isExcluded || isMarked;
                return (
                  <button
                    key={user._id}
                    type="button"
                    disabled={isDisabled || selecting}
                    onClick={() => handleSelect(user)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/60 transition-colors text-left',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{user.name || user.email}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                    {isMarked && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">{markedLabel}</span>}
                    {isExcluded && !isMarked && <CheckIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserPicker;
