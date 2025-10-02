import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import SearchInput from '@/components/SearchInput';
import { searchUsers, type UserListItem } from '@/services/users';
import { cn } from '@/lib/utils';
import { CheckIcon, UserIcon } from 'lucide-react';

interface UserPickerProps {
  placeholder?: string;
  excludeUserIds?: string[];
  onSelect: (user: UserListItem) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}

function UserPicker({ placeholder = '通过邮箱/姓名搜索用户', excludeUserIds = [], onSelect, className, disabled = false }: UserPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const excludeSet = new Set(excludeUserIds);

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

  const filteredResults = results.filter((u) => !excludeSet.has(u._id));

  return (
    <div className={cn('relative', className)}>
      <SearchInput
        placeholder={placeholder}
        value={query}
        onChange={setQuery}
        disabled={disabled || selecting}
      />
      
      {query && (
        <div className="absolute z-50 w-full mt-2 border rounded-lg bg-background shadow-lg max-h-80 overflow-auto">
          {loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              搜索中...
            </div>
          )}
          
          {!loading && filteredResults.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              无匹配结果
            </div>
          )}
          
          {!loading && filteredResults.length > 0 && (
            <div className="py-1">
              {filteredResults.map((user) => {
                const isExcluded = excludeSet.has(user._id);
                return (
                  <button
                    key={user._id}
                    type="button"
                    disabled={isExcluded || selecting}
                    onClick={() => handleSelect(user)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/60 transition-colors text-left',
                      isExcluded && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {user.name || user.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                    {isExcluded && (
                      <CheckIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
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
