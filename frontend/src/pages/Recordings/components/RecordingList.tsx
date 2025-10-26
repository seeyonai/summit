import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import SearchInput from '@/components/SearchInput';
import { ButtonGroup } from '@/components/ui/button-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiService } from '@/services/api';
import { recordingPanelBus } from '@/services/recordingPanelBus';
import { useRecordingPanel } from '@/contexts/RecordingPanelContext';
import { formatDuration, formatFileSize } from '@/utils/formatHelpers';
import type { Recording } from '@/types';
import { useRecordingList } from './hooks/useRecordingList';
import RecordingCard from '@/components/RecordingCard';
import RecordingListItem from '@/components/RecordingListItem';
import AssociateMeetingDialog from '@/components/AssociateMeetingDialog';
import { ItemGroup, ItemSeparator } from '@/components/ui/item';
import PageHeader from '@/components/PageHeader';
import {
  MicIcon,
  FilterIcon,
  ClockIcon,
  FileAudioIcon,
  RefreshCwIcon,
  GridIcon,
  ListIcon,
  ActivityIcon,
  FolderOpenIcon,
  AlertCircleIcon,
  UploadIcon,
} from 'lucide-react';

function RecordingList() {
  const navigate = useNavigate();
  const { toggleFloatingPanel } = useRecordingPanel();
  const { recordings, loading, error, fetchedAll, fetchRecordings, loadAll, deleteRecording: deleteRecordingAPI, setError } = useRecordingList();

  const [recording, setRecording] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'transcribed' | 'untranscribed'>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingRecordingId, setDeletingRecordingId] = useState<string | null>(null);

  // Keep local button state in sync with panel actions
  useEffect(() => {
    const unsubscribe = recordingPanelBus.subscribe((event) => {
      if (event.type === 'stop' || event.type === 'close') {
        setRecording(false);
      }
      if (event.type === 'start') {
        setRecording(true);
      }
    });
    return unsubscribe;
  }, []);

  // Show toast notifications for errors from the hook
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingRecordingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingRecordingId) return;

    try {
      await deleteRecordingAPI(deletingRecordingId);
      setDeletingRecordingId(null);
    } catch (err) {
      // Error already handled by the hook
      setDeletingRecordingId(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const inputEl = event.target as HTMLInputElement;

    // Validate file type
    const allowedTypes = [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/ogg',
      'audio/aac',
      'audio/x-aac',
      'audio/alac',
      'audio/x-ms-wma',
      'audio/wma',
      'audio/m4a',
      'audio/x-m4a',
      'audio/mp4',
      'audio/webm',
      'audio/flac',
      'audio/amr',
      'audio/g722',
      'audio/g72',
    ];
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = '不支持的文件格式。请上传 WAV、MP3、OGG、M4A 或 WEBM 格式的音频文件。';
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      const errorMsg = '文件大小超过限制。请上传小于 50MB 的音频文件。';
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      await apiService.uploadRecording(file, (p) => setUploadProgress(p));
      setUploading(false);
      setUploadProgress(0);
      inputEl.value = '';
      await fetchRecordings();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '上传失败';
      toast.error(errorMsg);
      setError(errorMsg);
      setUploading(false);
      setUploadProgress(0);
      inputEl.value = '';
    }
  };

  const openAssociationModal = (recording: Recording, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRecording(recording);
    setShowAssociationModal(true);
  };

  // Handle successful association
  const handleAssociationSuccess = async () => {
    setShowAssociationModal(false);
    setSelectedRecording(null);
    await fetchRecordings();
  };

  // Filtered recordings based on search and filter
  const filteredRecordings = useMemo(() => {
    return recordings
      .filter((recording) => {
        const name = (recording.label || recording.originalFileName || recording._id).toLowerCase();
        const matchesSearch =
          searchQuery === '' ||
          name.includes(searchQuery.toLowerCase()) ||
          recording.transcription?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter =
          filterStatus === 'all' ||
          (filterStatus === 'transcribed' && recording.transcription) ||
          (filterStatus === 'untranscribed' && !recording.transcription);

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        // Sort by most recently updated (use createdAt or updatedAt if available)
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [recordings, searchQuery, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const totalDuration = recordings.reduce((acc, r) => acc + (r.duration || 0), 0);
    const totalSize = recordings.reduce((acc, r) => acc + (r.fileSize || 0), 0);
    const transcribedCount = recordings.filter((r) => r.transcription).length;

    return {
      total: recordings.length,
      totalDuration,
      totalSize,
      transcribedCount,
      transcriptionRate: recordings.length > 0 ? (transcribedCount / recordings.length) * 100 : 0,
    };
  }, [recordings]);

  // Recording actions for shared components
  const getRecordingId = (recording: unknown): string => {
    const rec = recording as Record<string, unknown>;
    return (rec._id as string) || '';
  };

  const recordingActions = {
    onAssociate: (recording: unknown, e?: React.MouseEvent) => openAssociationModal(recording as unknown as Recording, e),
    onDelete: (recording: unknown, e?: React.MouseEvent) => handleDeleteClick(getRecordingId(recording), e),
  };

  const handleRecordingClick = (recording: unknown) => {
    navigate(`/recordings/${getRecordingId(recording)}`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="录音"
        subline="智能管理和分析您的音频记录"
        actionButtons={
          <>
            <div className="relative">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={uploading || recording}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                id="audio-upload"
              />
              <Button asChild disabled={uploading || recording} size="lg" variant="hero">
                <label htmlFor="audio-upload" className="cursor-pointer">
                  {uploading ? (
                    <>
                      <div className="w-3 h-3 bg-primary rounded-full animate-spin mr-2" />
                      上传中... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-5 h-5 mr-2" />
                      上传音频
                    </>
                  )}
                </label>
              </Button>
            </div>
            <Button onClick={toggleFloatingPanel} disabled={uploading} size="lg" variant="hero">
              <MicIcon className="w-5 h-5 mr-2" />
              快速录音
            </Button>
          </>
        }
      >
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">总录音数</p>
                <p className="stat-value">{stats.total}</p>
              </div>
              <FileAudioIcon className="stat-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">总时长</p>
                <p className="stat-value">{formatDuration(stats.totalDuration)}</p>
              </div>
              <ClockIcon className="stat-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">转录率</p>
                <p className="stat-value">{stats.transcriptionRate.toFixed(0)}%</p>
              </div>
              <ActivityIcon className="stat-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">存储空间</p>
                <p className="stat-value">{formatFileSize(stats.totalSize)}</p>
              </div>
              <FolderOpenIcon className="stat-icon" />
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Search and Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        <SearchInput className="flex-1" placeholder="搜索录音文件或转录内容..." value={searchQuery} onChange={setSearchQuery} />

        <div className="flex gap-2 items-center">
          <Select value={filterStatus} onValueChange={(value: 'all' | 'transcribed' | 'untranscribed') => setFilterStatus(value)}>
            <SelectTrigger className="w-[180px] h-11">
              <FilterIcon className="w-4 h-4 mr-2" />
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部录音</SelectItem>
              <SelectItem value="transcribed">已转录</SelectItem>
              <SelectItem value="untranscribed">未转录</SelectItem>
            </SelectContent>
          </Select>

          <ButtonGroup>
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')} size="icon" className="w-10 h-10">
              <GridIcon className="w-5 h-5" />
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')} size="icon" className="w-10 h-10">
              <ListIcon className="w-5 h-5" />
            </Button>
          </ButtonGroup>

          <Button onClick={fetchRecordings} variant="outline" size="default" className="h-11">
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* Truncation hint */}
      {!loading && fetchedAll === false && (
        <Alert>
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>显示最新 100 条录音</AlertTitle>
          <AlertDescription>
            为提升性能，仅展示最近创建的 100 条录音。您可以
            <Button variant="link" className="px-1" onClick={loadAll}>
              点击这里加载全部
            </Button>
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
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Recordings Grid/List */}
      {!loading &&
        filteredRecordings.length > 0 &&
        (viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecordings.map((recording) => (
              <RecordingCard
                key={recording._id}
                recording={recording}
                showMeetingInfo={true}
                showTranscriptionPreview={true}
                showSource
                actions={recordingActions}
                onClick={handleRecordingClick}
              />
            ))}
          </div>
        ) : (
          <ItemGroup>
            {filteredRecordings.map((recording, index) => (
              <div key={recording._id}>
                <RecordingListItem recording={recording} showSource actions={recordingActions} onClick={handleRecordingClick} />
                {index < filteredRecordings.length - 1 && <ItemSeparator />}
              </div>
            ))}
          </ItemGroup>
        ))}

      {/* Empty State */}
      {!loading && filteredRecordings.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileAudioIcon />
            </EmptyMedia>
            <EmptyTitle>{searchQuery || filterStatus !== 'all' ? '没有找到匹配的录音' : '暂无录音'}</EmptyTitle>
            <EmptyDescription>
              {searchQuery || filterStatus !== 'all' ? '尝试调整搜索条件或筛选器' : '点击"快速录音"开始录制您的第一个录音'}
            </EmptyDescription>
          </EmptyHeader>
          {(searchQuery || filterStatus !== 'all') && (
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                清除筛选
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}

      {/* Association Modal */}
      {selectedRecording && (
        <AssociateMeetingDialog
          isOpen={showAssociationModal}
          onClose={() => setShowAssociationModal(false)}
          recording={selectedRecording}
          onSuccess={handleAssociationSuccess}
          onError={setError}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingRecordingId !== null} onOpenChange={(open) => !open && setDeletingRecordingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除这个录音吗？此操作不可撤销。</AlertDialogDescription>
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

export default RecordingList;
