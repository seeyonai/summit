import { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { AlertCircle as AlertCircleIcon, PlusIcon, TrendingUp, Clock, Users, FolderOpenIcon, UploadIcon } from 'lucide-react';
import type { Hotword, HotwordUpdate, HotwordCreate } from '@/types';
import createHotwordService from '@/services/hotwordService';
import { useHotwords } from '@/hooks/useHotwords';
import { getHotwordAnalytics, filterHotwords } from '@/utils/hotwords';
import PageHeader from '@/components/PageHeader';
import HotwordToolbar from '@/pages/Hotwords/components/HotwordToolbar';
import HotwordCreateModal from '@/pages/Hotwords/components/HotwordCreateModal';
import HotwordEditModal from '@/pages/Hotwords/components/HotwordEditModal';
import HotwordBulkActions from '@/pages/Hotwords/components/HotwordBulkActions';
import HotwordImportDialog from '@/pages/Hotwords/components/HotwordImportDialog';
import HotwordListItem from '@/pages/Hotwords/components/HotwordListItem';
import HotwordCards from '@/pages/Hotwords/components/HotwordCards';

function HotwordListPage() {
  const service = useMemo(() => createHotwordService(), []);
  const { hotwords, loading, error, actions } = useHotwords(service);

  const stats = useMemo(() => getHotwordAnalytics(hotwords), [hotwords]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHotword, setEditingHotword] = useState<Hotword | null>(null);
  const [opError, setOpError] = useState<string | undefined>(undefined);
  const [deletingHotwordId, setDeletingHotwordId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleDeleteClick = (id: string) => {
    setDeletingHotwordId(id);
  };

  const confirmDelete = async () => {
    if (!deletingHotwordId) return;
    try {
      setOpError(undefined);
      await actions.deleteHotword(deletingHotwordId);
      setDeletingHotwordId(null);
    } catch (e) {
      setOpError(e instanceof Error ? e.message : '删除失败');
      setDeletingHotwordId(null);
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
    return actions.importHotwordsFromFile(file);
  };

  const handleExport = async () => {
    try {
      setOpError(undefined);
      setExporting(true);
      const { blob, filename } = await actions.exportHotwords();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setOpError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };


  return (
    <div className="space-y-8">
      <PageHeader
        title="热词"
        subline="集中维护识别热词，提升语音识别准确率"
        actionButtons={
          <>
            <Button onClick={() => setShowCreateModal(true)} size="lg" variant="hero">
              <PlusIcon className="w-5 h-5 mr-2" />
              添加热词
            </Button>
            <Button size="lg" variant="hero" onClick={() => setShowImportDialog(true)}>
              <UploadIcon className="w-5 h-5 mr-2" />
              批量导入
            </Button>
          </>
        }
      >
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">总热词数</p>
                <p className="stat-value">{stats.totalHotwords}</p>
              </div>
              <FolderOpenIcon className="stat-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">活跃率</p>
                <p className="stat-value">
                  {stats.totalHotwords > 0 ? Math.round((stats.activeHotwords / stats.totalHotwords) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="stat-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">本周新增</p>
                <p className="stat-value">{stats.recentlyAdded}</p>
              </div>
              <Clock className="stat-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">平均长度</p>
                <p className="stat-value">{stats.averageLength}</p>
              </div>
              <Users className="stat-icon" />
            </div>
          </div>
        </div>
      </PageHeader>

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
            onDelete={handleDeleteClick}
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
                onDelete={handleDeleteClick}
                onToggleActive={handleToggleActive}
                isLoading={loading}
              />
            ))}
          </div>
        )
      )}

      {!loading && !error && filtered.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlusIcon />
            </EmptyMedia>
            <EmptyTitle>
              {searchTerm || statusFilter !== 'all' ? '没有找到匹配的热词' : '暂无热词'}
            </EmptyTitle>
            <EmptyDescription>
              {searchTerm || statusFilter !== 'all' ? '尝试调整搜索条件或筛选器' : '点击"添加热词"开始创建'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
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
          </EmptyContent>
        </Empty>
      )}

      <HotwordBulkActions
        hotwords={hotwords}
        onExport={handleExport}
        isExporting={exporting}
      />

      <HotwordImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
      />

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingHotwordId !== null} onOpenChange={(open) => !open && setDeletingHotwordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除这个热词吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default HotwordListPage;
