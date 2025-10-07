import React from 'react';
import { Button } from '@/components/ui/button';
import SearchInput from '@/components/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterIcon, GridIcon, ListIcon, RefreshCwIcon } from 'lucide-react';

interface HotwordToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (value: 'grid' | 'list') => void;
  onRefresh: () => void;
}

function HotwordToolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  onRefresh,
}: HotwordToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <SearchInput
        className="flex-1"
        placeholder="搜索热词..."
        value={searchTerm}
        onChange={onSearchChange}
      />

      <div className="flex gap-2 items-center">
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as 'all' | 'active' | 'inactive')}>
          <SelectTrigger className="w-[180px] h-11">
            <FilterIcon className="w-4 h-4 mr-2" />
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部热词</SelectItem>
            <SelectItem value="active">启用</SelectItem>
            <SelectItem value="inactive">禁用</SelectItem>
          </SelectContent>
        </Select>

        {/* XXX: Button Group */}
        <div className="flex border border-border dark:border-border rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('grid')}
            className={`rounded-r-none ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : ''}`}
          >
            <GridIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('list')}
            className={`rounded-l-none ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : ''}`}
          >
            <ListIcon className="w-4 h-4" />
          </Button>
        </div>

        <Button onClick={onRefresh} variant="outline" size="default" className="h-11">
          <RefreshCwIcon className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>
    </div>
  );
}

export default HotwordToolbar;
