import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchInput from '@/components/SearchInput';
import { ButtonGroup } from '@/components/ui/button-group';
import { Skeleton } from '@/components/ui/skeleton';
import { apiService } from '@/services/api';
import type { NoteCreate } from '@/types';
import { useNotes } from '@/hooks/useNotes';
import NoteForm from '@/components/Note/NoteForm';
import NoteFormZenMode from '@/components/Note/NoteFormZenMode';
import NoteCard from '@/components/Note/NoteCard';
import NoteListItem from '@/components/Note/NoteListItem';
import { ItemGroup, ItemSeparator } from '@/components/ui/item';
import PageHeader from '@/components/PageHeader';
import { FileTextIcon, PlusIcon, FilterIcon, RefreshCwIcon, GridIcon, ListIcon, AlertCircleIcon, FileEditIcon, CheckCircleIcon, FolderOpenIcon, ZapIcon } from 'lucide-react';

function NoteList() {
  const navigate = useNavigate();
  const { notes, loading, error, refetch, fetchedAll, loadAll } = useNotes();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showZenMode, setShowZenMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'final'>('all');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const openCreateModal = () => {
    setCreateError(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError(null);
  };

  const createNote = async (noteData: NoteCreate) => {
    try {
      setCreating(true);
      setCreateError(null);

      await apiService.createNote(noteData);
      refetch();
      closeCreateModal();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error creating note');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingNoteId(id);
  };

  const confirmDelete = async () => {
    if (!deletingNoteId) return;

    try {
      await apiService.deleteNote(deletingNoteId);
      refetch();
      setDeletingNoteId(null);
    } catch (err) {
      console.error('Error deleting note:', err);
      setDeletingNoteId(null);
    }
  };

  const handleExport = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await apiService.exportNote(id);
    } catch (err) {
      console.error('Error exporting note:', err);
    }
  };

  const handleZenModeSave = async (noteData: NoteCreate) => {
    try {
      await apiService.createNote(noteData);
      refetch();
      // Don't close zen mode - let user continue writing
    } catch (err) {
      console.error('Error creating note in zen mode:', err);
      throw err;
    }
  };

  // Filtered notes based on search and filter
  const filteredNotes = useMemo(() => {
    return (notes || [])
      .filter(note => {
        const matchesSearch = searchQuery === '' ||
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesFilter = filterStatus === 'all' ||
          note.status === filterStatus;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        const timeA = dateA ? new Date(dateA as string | number | Date).getTime() : 0;
        const timeB = dateB ? new Date(dateB as string | number | Date).getTime() : 0;
        return timeB - timeA;
      });
  }, [notes, searchQuery, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const draftCount = notes.filter(n => n.status === 'draft').length;
    const finalCount = notes.filter(n => n.status === 'final').length;
    const withMeetingCount = notes.filter(n => n.meetingId).length;

    return {
      total: notes.length,
      draftCount,
      finalCount,
      withMeetingCount,
    };
  }, [notes]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="速记"
        subline="管理您的会议速记和笔记"
        actionButtons={
          <div className="flex gap-3">
            <Button onClick={openCreateModal} size="lg" variant="hero">
              <PlusIcon className="w-5 h-5 mr-2" />
              新建速记
            </Button>
            <Button onClick={() => setShowZenMode(true)} size="lg" variant="outline">
              <ZapIcon className="w-5 h-5 mr-2" />
              专注模式
            </Button>
          </div>
        }
      >
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">总速记数</p>
                <p className="stat-value">{stats.total}</p>
              </div>
              <FolderOpenIcon className="stat-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">草稿</p>
                <p className="stat-value">{stats.draftCount}</p>
              </div>
              <FileEditIcon className="stat-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">定稿</p>
                <p className="stat-value">{stats.finalCount}</p>
              </div>
              <CheckCircleIcon className="stat-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">关联会议</p>
                <p className="stat-value">{stats.withMeetingCount}</p>
              </div>
              <FileTextIcon className="stat-icon" />
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Search and Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        <SearchInput
          className="flex-1"
          placeholder="搜索标题、内容或标签..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="flex gap-2 items-center">
          <Select value={filterStatus} onValueChange={(value: 'all' | 'draft' | 'final') => setFilterStatus(value)}>
            <SelectTrigger className="w-[180px] h-11">
              <FilterIcon className="w-4 h-4 mr-2" />
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部速记</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="final">定稿</SelectItem>
            </SelectContent>
          </Select>

          <ButtonGroup>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
              size="icon"
              className="w-10 h-10"
            >
              <GridIcon className="w-5 h-5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              size="icon"
              className="w-10 h-10"
            >
              <ListIcon className="w-5 h-5" />
            </Button>
          </ButtonGroup>

          <Button onClick={refetch} variant="outline" size="default" className="h-11">
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* Truncation hint */}
      {!loading && !error && fetchedAll === false && (
        <Alert>
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>显示最新 100 条速记</AlertTitle>
          <AlertDescription>
            为提升性能，仅展示最近创建的 100 条速记。您可以
            <Button variant="link" className="px-1" onClick={() => loadAll()}>点击这里加载全部</Button>
            。
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
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
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Notes Grid/List */}
      {!loading && !error && filteredNotes.length > 0 && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <NoteCard key={note._id} note={note} onDelete={handleDeleteClick} onExport={handleExport} />
            ))}
          </div>
        ) : (
          <ItemGroup>
            {filteredNotes.map((note, index) => (
              <div key={note._id}>
                <NoteListItem
                  note={note}
                  onClick={(note) => navigate(`/notes/${note._id}`)}
                  actions={{
                    onExport: (note, e) => handleExport(note._id, e),
                    onDelete: (note, e) => handleDeleteClick(note._id, e),
                  }}
                />
                {index < filteredNotes.length - 1 && <ItemSeparator />}
              </div>
            ))}
          </ItemGroup>
        )
      )}

      {/* Empty State */}
      {!loading && !error && filteredNotes.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery || filterStatus !== 'all' ? '没有找到匹配的速记' : '暂无速记'}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery || filterStatus !== 'all'
                ? '尝试调整搜索条件或筛选器'
                : '点击"新建速记"创建您的第一条速记'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {(searchQuery || filterStatus !== 'all') ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                清除筛选
              </Button>
            ) : (
              <Button onClick={openCreateModal}>
                <PlusIcon className="w-4 h-4 mr-2" />
                新建速记
              </Button>
            )}
          </EmptyContent>
        </Empty>
      )}

      {/* Create Note Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateModal();
            return;
          }
          setShowCreateModal(true);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <NoteForm
            mode="create"
            onSubmit={createNote}
            onCancel={closeCreateModal}
            loading={creating}
            error={createError}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingNoteId !== null} onOpenChange={(open) => !open && setDeletingNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除这条速记吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Zen Mode */}
      <NoteFormZenMode
        isOpen={showZenMode}
        onClose={() => setShowZenMode(false)}
        mode="create"
        onSave={handleZenModeSave}
      />
    </div>
  );
}

export default NoteList;
