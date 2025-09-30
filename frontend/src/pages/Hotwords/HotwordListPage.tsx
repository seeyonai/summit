import React, { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle as AlertCircleIcon, PlusIcon } from 'lucide-react';
import type { Hotword, HotwordUpdate, HotwordCreate } from '@/types';
import createHotwordService from '@/services/hotwordService';
import { useHotwords } from '@/hooks/useHotwords';
import { getHotwordAnalytics, filterHotwords, exportHotwords } from '@/utils/hotwords';
import HotwordHeader from '@/pages/Hotwords/components/HotwordHeader';
import HotwordToolbar from '@/pages/Hotwords/components/HotwordToolbar';
import HotwordCreateModal from '@/pages/Hotwords/components/HotwordCreateModal';
import HotwordEditModal from '@/pages/Hotwords/components/HotwordEditModal';
import HotwordBulkActions from '@/pages/Hotwords/components/HotwordBulkActions';
import HotwordListItem from '@/pages/Hotwords/components/HotwordListItem';
import HotwordStats from '@/pages/Hotwords/components/HotwordStats';
import HotwordCards from '@/pages/Hotwords/components/HotwordList';

function HotwordListPage() {
  const service = useMemo(() => createHotwordService(), []);
  const { hotwords, loading, error, actions } = useHotwords(service);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHotword, setEditingHotword] = useState<Hotword | null>(null);
  const [opError, setOpError] = useState<string | undefined>(undefined);

  const stats = useMemo(() => getHotwordAnalytics(hotwords), [hotwords]);
  const filtered = useMemo(() => filterHotwords(hotwords, searchTerm, statusFilter), [hotwords, searchTerm, statusFilter]);

  const handleCreate = async (payload: HotwordCreate) => {
    try {
      setOpError(undefined);
      await actions.createHotword(payload);
      setShowCreateModal(false);
    } catch (e) {
      setOpError(e instanceof Error ? e.message : '创建失败');
    }
  };

  const handleEdit = (hotword: Hotword) => {
    setEditingHotword(hotword);
    setShowEditModal(true);
  };

  const handleUpdate = async (payload: HotwordUpdate) => {
    try {
      setOpError(undefined);
      await actions.updateHotword(payload._id, payload);
      setShowEditModal(false);
      setEditingHotword(null);
    } catch (e) {
      setOpError(e instanceof Error ? e.message : '更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个热词吗？此操作不可撤销。')) return;
    try {
      setOpError(undefined);
      await actions.deleteHotword(id);
    } catch (e) {
      setOpError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleToggleActive = async (h: Hotword) => {
    try {
      setOpError(undefined);
      await actions.toggleHotwordStatus(h._id, !h.isActive);
    } catch (e) {
      setOpError(e instanceof Error ? e.message : '切换状态失败');
    }
  };

  const handleImport = async (file: File) => {
    // Placeholder: parsing logic could be implemented later
    // For now, simply simulate a delay
    await new Promise((r) => setTimeout(r, 400));
  };

  const handleExport = () => {
    const csv = exportHotwords(hotwords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotwords-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <HotwordHeader stats={stats} onCreate={() => setShowCreateModal(true)} />

      <HotwordToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={actions.fetchHotwords}
      />

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-4" />
              <Skeleton className="h-16 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {opError && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{opError}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && filtered.length > 0 && (
        viewMode === 'grid' ? (
          /* Reuse existing card list component */
          <HotwordCards
            hotwords={filtered}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            isLoading={loading}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((h) => (
              <HotwordListItem
                key={h._id}
                hotword={h}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                isLoading={loading}
              />
            ))}
          </div>
        )
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              {/* icon placeholder */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" /></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? '没有找到匹配的热词' : '暂无热词'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' ? '尝试调整搜索条件或筛选器' : '点击“添加热词”开始创建'}
            </p>
            {(searchTerm || statusFilter !== 'all') ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                清除筛选
              </Button>
            ) : (
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                添加热词
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Bulk actions & insights */}
      <HotwordStats analytics={stats} />
      <HotwordBulkActions hotwords={hotwords} onImport={handleImport} onExport={handleExport} isLoading={loading} />

      {/* Modals */}
      <HotwordCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreate}
        isLoading={loading}
        error={opError}
      />

      <HotwordEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        hotword={editingHotword}
        onSubmit={handleUpdate}
        onCancel={() => setShowEditModal(false)}
        isLoading={loading}
        error={opError}
      />
    </div>
  );
}

export default HotwordListPage;
