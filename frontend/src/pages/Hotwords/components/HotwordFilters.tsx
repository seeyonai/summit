import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Plus, X } from 'lucide-react';
import type { Hotword } from '@/types';

interface HotwordFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (status: 'all' | 'active' | 'inactive') => void;
  onAddHotword: () => void;
}

const HotwordFilters: React.FC<HotwordFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddHotword,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选和搜索
          </span>
          <Button onClick={onAddHotword} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加热词
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索热词..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => onStatusFilterChange(status)}
                className="flex items-center gap-2"
              >
                {status === 'all' && '全部'}
                {status === 'active' && '启用'}
                {status === 'inactive' && '禁用'}
                {statusFilter === status && (
                  <Badge variant="secondary" className="ml-1">
                    {status === 'all' ? '' : status === 'active' ? 'ON' : 'OFF'}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HotwordFilters;