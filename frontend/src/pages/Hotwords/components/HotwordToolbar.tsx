import React from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
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

        <ButtonGroup>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => onViewModeChange('grid')}
            size="icon"
            className="w-10 h-10"
          >
            <GridIcon className="w-5 h-5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => onViewModeChange('list')}
            size="icon"
            className="w-10 h-10"
          >
            <ListIcon className="w-5 h-5" />
          </Button>
        </ButtonGroup>

        <Button onClick={onRefresh} variant="outline" size="default" className="h-11">
          <RefreshCwIcon className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>
    </div>
  );
}

export default HotwordToolbar;
