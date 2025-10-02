import { useState } from 'react';
 
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
 
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AudioPlayer from '@/components/AudioPlayer';
import HotwordSelection from '@/components/HotwordSelection';
import BackButton from '@/components/BackButton';
 
import RecordingTranscription from './RecordingTranscription';
import RecordingAlignment from './RecordingAlignment';
import RecordingAnalysis from './RecordingAnalysis';
import RecordingInfo from './RecordingInfo';
import RecordingOrganize from './RecordingOrganize';
import AssociateMeetingDialog from '@/components/AssociateMeetingDialog';
import { useRecording } from './hooks/useRecording';
import {
  SaveIcon,
  LinkIcon,
  CalendarIcon,
  ClockIcon,
  FileAudioIcon,
  AlertCircleIcon,
  HeadphonesIcon,
  ActivityIcon,
  BarChart3Icon,
  FileTextIcon,
  CheckCircleIcon,
  UsersIcon,
  InfoIcon,
  Link2Icon,
  DownloadIcon,
  Trash2Icon
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


function RecordingDetailRedesign() {
  const [showHotwordSelection, setShowHotwordSelection] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    generateTranscription,
    handleDownloadRecording,
    deleteRecording,
  } = useRecording();

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
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('zh-CN');
  };

  // note: segmentation and polish handlers are unused in this view

  const handleHotwordTranscribe = () => {
    setShowHotwordSelection(false);
    generateTranscription();
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
  const handleDeleteConfirm = () => {
    setShowDeleteDialog(false);
    deleteRecording();
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">加载录音详情...</p>
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-destructive dark:bg-destructive/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircleIcon className="h-8 w-8 text-red-500 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">录音未找到</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error || '请求的录音不存在或已被删除'}</p>
              <BackButton url="/recordings">返回录音列表</BackButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <BackButton>返回</BackButton>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDownloadRecording}
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>下载录音</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={openAssociateModal}
                    >
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

          {/* Main Header Content */}
          <div className="">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <HeadphonesIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-foreground mb-2">
                      {(recording as any).originalFileName || recording._id}
                    </h1>

                    {/* Meeting Information */}
                    {recording.meeting && (
                      <div className="mb-2">
                        <div className="inline-flex items-center gap-2 text-sm">
                          <LinkIcon className="w-4 h-4" />
                          <span className="">关联会议:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{recording.meeting.title}</span>
                          <Badge
                            variant={recording.meeting.status === 'completed' ? 'default' :
                              recording.meeting.status === 'in_progress' ? 'secondary' :
                                recording.meeting.status === 'scheduled' ? 'outline' : 'destructive'}
                            className={
                              recording.meeting.status === 'completed' ? 'bg-completed' :
                                recording.meeting.status === 'in_progress' ? 'bg-success' :
                                  recording.meeting.status === 'scheduled' ? 'bg-info' :
                                    'bg-destructive'
                            }
                          >
                            {recording.meeting.status === 'completed' ? '已完成' :
                              recording.meeting.status === 'in_progress' ? '进行中' :
                                recording.meeting.status === 'scheduled' ? '已排期' : '失败'}
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

              <div className="flex gap-2">
                {isEditing ? (
                  <Button
                    onClick={updateRecording}
                    className="bg-blue-600 hover:bg-primary text-white"
                  >
                    <SaveIcon className="w-4 h-4 mr-2" />
                    保存更改
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => setShowInfoModal(true)}
                      variant="outline"
                      aria-label="查看录音信息"
                    >
                      <InfoIcon className="w-4 h-4" />
                      查看录音信息
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 mb-6">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ActivityIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">比特率</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {recording.metadata?.bitrate || (recording.fileSize && recording.duration ? Math.round((recording.fileSize / recording.duration) * 8 / 1000) : '-')} kbps
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {recording.metadata?.codec || recording.format || 'WAV'}
                </p>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">转录进度</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {recording.transcription ? '100%' : '0%'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {recording.transcription ? '已完成' : '待处理'}
                </p>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileTextIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">字数统计</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {recording.transcription ? recording.transcription.length.toLocaleString() : 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">总字符</p>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <UsersIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">说话人数</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {recording.numSpeakers || (recording.speakerSegments ? new Set(recording.speakerSegments.map(s => s.speakerIndex)).size : 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  声道数: {recording.metadata?.channels || recording.channels || '-'}
                </p>
              </div>
            </div>

            {/* Audio Player */}
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <HeadphonesIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">音频播放器</h3>
              </div>
              <AudioPlayer
                showFilename={false}
                recording={recording}
                timestamps={recording.speakerSegments?.map(segment => ({
                  time: segment.startTime,
                  label: `说话人 ${segment.speakerIndex + 1}`
                })) || []}
              />
            </div>
          </div>
        </div>

        {/* Pipeline Stages Grid */}
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

          <RecordingAlignment
            recording={recording}
            isEditing={isEditing}
            editForm={editForm}
            setSuccess={setSuccess}
            setError={setError}
          />

          <RecordingAnalysis
            recording={recording}
            onRefresh={fetchRecording}
            setSuccess={setSuccess}
            setError={setError}
          />

          <div className="lg:col-span-2">
            <RecordingOrganize
              recording={recording}
              setSuccess={setSuccess}
              setError={setError}
              onRefresh={fetchRecording}
            />
          </div>
        </div>

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

        {/* Hotword Selection Modal */}
        {showHotwordSelection && (
          <HotwordSelection
            isOpen={showHotwordSelection}
            onClose={() => setShowHotwordSelection(false)}
            onApply={handleHotwordTranscribe}
            currentHotwords={recording.transcription ? [recording.transcription] : []}
          />
        )}

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
              <DialogDescription>
                您确定要删除这个录音吗？此操作不可撤销，录音文件和所有相关数据将被永久删除。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                <Trash2Icon className="w-4 h-4 mr-2" />
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div >
  );
}

export default RecordingDetailRedesign;
