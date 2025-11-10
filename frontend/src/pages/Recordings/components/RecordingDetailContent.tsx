import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AudioPlayer from '@/components/AudioPlayer';
import StatisticsCard from '@/components/StatisticsCard';

import RecordingTranscription from './RecordingTranscription';
import RecordingAlignment from './RecordingAlignment';
import RecordingAnalysis from './RecordingAnalysis';
import RecordingInfo from './RecordingInfo';
import RecordingOrganize from './RecordingOrganize';
import AssociateMeetingDialog from '@/components/AssociateMeetingDialog';
import { useRecordingDetail, type EditForm } from './hooks/useRecordingDetail';
import { buildSpeakerNameMap, getSpeakerDisplayName } from '@/utils/speakerNames';
import { apiService } from '@/services/api';
import {
  SaveIcon,
  LinkIcon,
  CalendarIcon,
  ClockIcon,
  FileAudioIcon,
  AlertCircleIcon,
  ActivityIcon,
  BarChart3Icon,
  FileTextIcon,
  CheckCircleIcon,
  UsersIcon,
  InfoIcon,
  Link2Icon,
  DownloadIcon,
  Trash2Icon,
  EditIcon,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getSourceIcon, getSourceLabel } from '@/utils/recordingSource';
import type { Recording } from '@/types';

interface RecordingDetailContentProps {
  recordingId?: string;
  recording?: Recording;
  onRefresh?: () => void | Promise<void>;
  onDelete?: () => void;
  showBackButton?: boolean;
  compact?: boolean;
}

function RecordingDetailContent({
  recordingId,
  recording: initialRecording,
  onRefresh,
  onDelete,
  showBackButton = false,
  compact = false,
}: RecordingDetailContentProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditLabelDialog, setShowEditLabelDialog] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  const {
    recording,
    loading,
    error,
    success,
    isEditing,
    editForm,
    setEditForm,
    setSuccess,
    setError,
    fetchRecording,
    updateRecording,
    toggleEditing,
    handleDownloadRecording,
    deleteRecording,
  } = useRecordingDetail({ recordingId, recording: initialRecording, onRefresh });

  const speakerNames = recording?.speakerNames;
  const speakerNameMap = useMemo(() => buildSpeakerNameMap(speakerNames), [speakerNames]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('zh-CN');
  };

  // Open associate modal
  const openAssociateModal = () => {
    setShowAssociateModal(true);
  };

  // Handle successful association
  const handleAssociationSuccess = () => {
    fetchRecording();
    setSuccess('录音已成功关联到会议');
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false);
    await deleteRecording();
    if (onDelete) {
      onDelete();
    }
  };

  // Open edit label dialog
  const openEditLabelDialog = () => {
    setLabelInput(recording?.label || '');
    setShowEditLabelDialog(true);
  };

  // Handle label update
  const handleLabelUpdate = async () => {
    if (!recording) return;
    try {
      await apiService.updateRecording(recording._id, { label: labelInput });
      await fetchRecording();
      setShowEditLabelDialog(false);
      setSuccess('录音名称已更新');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">加载录音详情...</p>
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-destructive dark:bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircleIcon className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">录音未找到</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error || '请求的录音不存在或已被删除'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Header */}
      <div className={compact ? 'mb-4' : 'mb-6'}>
        {!compact && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleDownloadRecording}>
                      <DownloadIcon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>下载录音</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={openAssociateModal}>
                      <Link2Icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>关联到会议</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-destructive dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-destructive"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除录音</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Main Header Content */}
        <div className="">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const SourceIcon = getSourceIcon(recording.source);
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <SourceIcon className="w-4 h-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getSourceLabel(recording.source)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                    <div className="flex items-center gap-3">
                      <h1 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-foreground mb-2`}>
                        {recording.label || (recording as any).originalFileName || recording._id}
                      </h1>
                      <Button onClick={openEditLabelDialog} variant="ghost" size="sm" className="mb-2">
                        <EditIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Original Filename (shown when label exists) */}
                  {recording.label && (recording as any).originalFileName && (
                    <div className="mb-2">
                      <div className="inline-flex items-center gap-2 text-sm text-foreground">
                        <FileAudioIcon className="w-4 h-4" />
                        <span className="">原始文件:</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">{(recording as any).originalFileName}</span>
                      </div>
                    </div>
                  )}

                  {/* Meeting Information */}
                  {recording.meeting && (
                    <div className="mb-2">
                      <div className="inline-flex items-center gap-2 text-sm">
                        <LinkIcon className="w-4 h-4" />
                        <span className="">关联会议:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{recording.meeting.title}</span>
                        <Badge
                          variant={
                            recording.meeting.status === 'completed'
                              ? 'default'
                              : recording.meeting.status === 'in_progress'
                              ? 'secondary'
                              : recording.meeting.status === 'scheduled'
                              ? 'outline'
                              : 'destructive'
                          }
                          className={
                            recording.meeting.status === 'completed'
                              ? 'bg-completed'
                              : recording.meeting.status === 'in_progress'
                              ? 'bg-success'
                              : recording.meeting.status === 'scheduled'
                              ? 'bg-info'
                              : 'bg-destructive'
                          }
                        >
                          {recording.meeting.status === 'completed'
                            ? '已完成'
                            : recording.meeting.status === 'in_progress'
                            ? '进行中'
                            : recording.meeting.status === 'scheduled'
                            ? '已排期'
                            : '已取消'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-baseline gap-4 text-sm font-mono">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="text-muted-foreground ml-1 mr-2">{formatDate(recording.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span className="text-muted-foreground ml-1 mr-2">{recording.duration ? formatTime(recording.duration) : '未知'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileAudioIcon className="w-4 h-4" />
                      <span className="text-muted-foreground ml-1 mr-2">{formatFileSize(recording.fileSize)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!compact && (
              <div className="flex gap-2">
                {isEditing && (
                  <Button onClick={updateRecording} className="bg-blue-600 hover:bg-primary text-white">
                    <SaveIcon className="w-4 h-4 mr-2" />
                    保存更改
                  </Button>
                )}
                <Button onClick={() => setShowInfoModal(true)} variant="outline" aria-label="查看录音信息">
                  <InfoIcon className="w-4 h-4" />
                  查看录音信息
                </Button>
              </div>
            )}
          </div>

          {/* Statistics Cards */}
          {!compact && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 mb-6">
              <StatisticsCard
                icon={<ActivityIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                label="比特率"
                value={`${
                  recording.metadata?.bitrate ||
                  (recording.fileSize && recording.duration ? Math.round(((recording.fileSize / recording.duration) * 8) / 1000) : '-')
                } kbps`}
                description={recording.metadata?.codec || recording.format || 'WAV'}
              />

              <StatisticsCard
                icon={<BarChart3Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                label="转录进度"
                value={recording.transcription ? '100%' : '0%'}
                description={recording.transcription ? '已完成' : '待处理'}
              />

              <StatisticsCard
                icon={<FileTextIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                label="字数统计"
                value={recording.transcription ? recording.transcription.length.toLocaleString() : 0}
                description="总字符"
              />

              <StatisticsCard
                icon={<UsersIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                label="说话人数"
                value={recording.numSpeakers || (recording.speakerSegments ? new Set(recording.speakerSegments.map((s) => s.speakerIndex)).size : 0)}
                description={`声道数: ${recording.metadata?.channels || recording.channels || '-'}`}
              />
            </div>
          )}

          {/* Audio Player */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              {(() => {
                const SourceIcon = getSourceIcon(recording.source);
                return <SourceIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
              })()}
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">音频播放器</h3>
            </div>
            <AudioPlayer
              showFilename={false}
              recording={recording}
              timestamps={
                recording.speakerSegments?.map((segment) => ({
                  time: segment.startTime,
                  label: getSpeakerDisplayName(segment.speakerIndex, speakerNameMap),
                })) || []
              }
            />
          </div>
        </div>
      </div>

      {/* Pipeline Stages Grid */}
      {!compact && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <RecordingTranscription
              recording={recording}
              isEditing={isEditing}
              editForm={editForm}
              setEditForm={setEditForm}
              onRefresh={fetchRecording}
              setSuccess={setSuccess}
              setError={setError}
              onEditToggle={toggleEditing}
            />
          </div>

          <RecordingAlignment recording={recording} isEditing={isEditing} editForm={editForm} setSuccess={setSuccess} setError={setError} />

          <RecordingAnalysis recording={recording} onRefresh={fetchRecording} setSuccess={setSuccess} setError={setError} />

          <div className="lg:col-span-2">
            <RecordingOrganize recording={recording} setSuccess={setSuccess} setError={setError} onRefresh={fetchRecording} />
          </div>

          {/* <p className="text-xs text-gray-500 dark:text-gray-400">AI生成的内容不保证准确性。请在生成PPT之前仔细审查和编辑内容。</p> */}
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Info Modal */}
      <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>录音详情</DialogTitle>
            <DialogDescription>文件与元数据</DialogDescription>
          </DialogHeader>
          {recording && (
            <div className="max-h-[70vh] overflow-y-auto">
              <RecordingInfo recording={recording} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Associate to Meeting Modal */}
      {recording && (
        <AssociateMeetingDialog
          isOpen={showAssociateModal}
          onClose={() => setShowAssociateModal(false)}
          recording={recording}
          onSuccess={handleAssociationSuccess}
          onError={setError}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除录音</DialogTitle>
            <DialogDescription>您确定要删除这个录音吗？此操作不可撤销，录音文件和所有相关数据将被永久删除。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2Icon className="w-4 h-4 mr-2" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Label Dialog */}
      <Dialog open={showEditLabelDialog} onOpenChange={setShowEditLabelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑录音名称</DialogTitle>
            <DialogDescription>为录音设置一个更易识别的显示名称</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">显示名称</label>
            <Input
              placeholder="输入录音名称"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLabelUpdate();
                }
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">留空将使用原始文件名或录音 ID</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLabelDialog(false)}>
              取消
            </Button>
            <Button onClick={handleLabelUpdate}>
              <SaveIcon className="w-4 h-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RecordingDetailContent;
