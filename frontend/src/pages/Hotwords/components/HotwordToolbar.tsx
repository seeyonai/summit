import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchIcon, FilterIcon, GridIcon, ListIcon, RefreshCwIcon } from 'lucide-react';

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="搜索热词..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 h-11 border-gray-200 focus:border-blue-500 transition-colors"
          />
        </div>

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

          <div className="flex border border-gray-200 dark:border-gray-600 rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => onViewModeChange('grid')}
              className="rounded-r-none"
            >
              <GridIcon className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => onViewModeChange('list')}
              className="rounded-l-none"
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
    </div>
  );
}

export default HotwordToolbar;
