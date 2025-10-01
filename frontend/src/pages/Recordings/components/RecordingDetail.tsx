import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AudioPlayer from '@/components/AudioPlayer';
import HotwordSelection from '@/components/HotwordSelection';
import type { Recording } from '@/types';
import { apiService, apiUrl } from '@/services/api';
import RecordingTranscription from './RecordingTranscription';
import RecordingAlignment from './RecordingAlignment';
import RecordingAnalysis from './RecordingAnalysis';
import RecordingInfo from './RecordingInfo';
import RecordingOrganize from './RecordingOrganize';
import AssociateMeetingDialog from '@/components/AssociateMeetingDialog';
import {
  ArrowLeftIcon,
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
  DownloadIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


function RecordingDetailRedesign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ transcription?: string; verbatimTranscript?: string }>({});
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'transcription');
  const [, setTranscribing] = useState(false);
  const [showHotwordSelection, setShowHotwordSelection] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAssociateModal, setShowAssociateModal] = useState(false);

  // Fetch recording details
  const fetchRecording = useCallback(async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Missing recording identifier');
      const data = await apiService.getRecording(id);
      setRecording(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Update recording
  const updateRecording = async () => {
    if (!recording) return;

    try {
      const { message } = await apiService.updateRecording(recording._id, editForm);
      await fetchRecording();
      setIsEditing(false);
      setEditForm({});
      setSuccess(message || '录音更新成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Toggle editing
  const toggleEditing = () => {
    if (!recording) return;
    
    if (isEditing) {
      setIsEditing(false);
      setEditForm({});
    } else {
      setEditForm({
        transcription: recording.transcription,
        verbatimTranscript: recording.verbatimTranscript,
      });
      setIsEditing(true);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRecording();
    }
  }, [id, fetchRecording]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

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

  const generateTranscription = async () => {
    try {
      setTranscribing(true);
      if (!recording) throw new Error('Missing recording');
      const { message } = await apiService.transcribeRecording(recording._id);
      await fetchRecording();
      setSuccess(message || '转录生成成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTranscribing(false);
    }
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

  // Download recording
  const handleDownloadRecording = async () => {
    if (!recording) return;
    
    const fileUrl = recording.filePath || recording.filename;
    if (!fileUrl) {
      setError('无法获取录音文件路径');
      return;
    }
    
    try {
      const downloadUrl = `${apiUrl(fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`)}`;
      
      // Fetch the file as a blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('下载失败');
      }
      
      const blob = await response.blob();
      
      // Create a blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = recording.filename || `recording-${recording._id}.${recording.format || 'wav'}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
      setSuccess('录音文件下载完成');
    } catch (error) {
      setError(error instanceof Error ? error.message : '下载失败');
    }
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
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircleIcon className="h-8 w-8 text-red-500 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">录音未找到</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error || '请求的录音不存在或已被删除'}</p>
              <Button
                onClick={() => navigate('/recordings')}
                variant="outline"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                返回录音列表
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => history.back()}
              variant="ghost"
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              返回
            </Button>
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
              
              {!recording.meeting && (
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
              )}
            </div>
          </div>
          
          {/* Main Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <HeadphonesIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {recording.filename}
                      </h1>
                        
                      {/* Meeting Information */}
                      {recording.meeting && (
                        <div className="mb-3">
                          <div className="inline-flex items-center gap-2 text-sm">
                            <LinkIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">关联会议:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{recording.meeting.title}</span>
                            <Badge 
                              variant={recording.meeting.status === 'completed' ? 'default' : 
                                      recording.meeting.status === 'in_progress' ? 'secondary' : 
                                      recording.meeting.status === 'scheduled' ? 'outline' : 'destructive'}
                              className={
                                recording.meeting.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                recording.meeting.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                recording.meeting.status === 'scheduled' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }
                            >
                              {recording.meeting.status === 'completed' ? '已完成' :
                               recording.meeting.status === 'in_progress' ? '进行中' :
                               recording.meeting.status === 'scheduled' ? '已排期' : '失败'}
                            </Badge>
                          </div>
                        </div>
                      )}
                        
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{formatDate(recording.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          <span>{recording.duration ? formatTime(recording.duration) : '未知'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileAudioIcon className="w-4 h-4" />
                          <span>{formatFileSize(recording.fileSize)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              
                <div className="flex gap-2">
                  {isEditing ? (
                    <Button
                      onClick={updateRecording}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <SaveIcon className="w-4 h-4 mr-2" />
                      保存更改
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => setShowInfoModal(true)}
                        variant="outline"
                        size="icon"
                        aria-label="查看录音信息"
                      >
                        <InfoIcon className="w-4 h-4" />
                      </Button>
                      </>
                  )}
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
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
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
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
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileTextIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">字数统计</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {recording.transcription ? recording.transcription.length.toLocaleString() : 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">总字符</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
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
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <HeadphonesIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">音频播放器</h3>
                </div>
                <AudioPlayer 
                  recording={recording} 
                  timestamps={recording.speakerSegments?.map(segment => ({
                    time: segment.startTime,
                    label: `说话人 ${segment.speakerIndex + 1}`
                  })) || []}
                />
              </div>
            </div>
          </div>
        </div>

  
        {/* Speaker Timeline moved to RecordingAnalysis to avoid duplication */}

        {/* Main Content Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            setActiveTab(value);
            setSearchParams({ tab: value });
          }} 
          className="mt-6"
        >
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="transcription">转录</TabsTrigger>
            <TabsTrigger value="alignment">对齐</TabsTrigger>
            <TabsTrigger value="analysis">分割</TabsTrigger>
            <TabsTrigger value="organize">整理</TabsTrigger>
          </TabsList>

          <TabsContent value="transcription">
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
          </TabsContent>

          <TabsContent value="alignment">
            <RecordingAlignment
              recording={recording}
              isEditing={isEditing}
              editForm={editForm}
              setSuccess={setSuccess}
              setError={setError}
            />
          </TabsContent>

          <TabsContent value="analysis">
            <RecordingAnalysis
              recording={recording}
              onRefresh={fetchRecording}
              setSuccess={setSuccess}
              setError={setError}
            />
          </TabsContent>

          <TabsContent value="organize">
            <RecordingOrganize
              recording={recording}
              setSuccess={setSuccess}
              setError={setError}
              onRefresh={fetchRecording}
            />
          </TabsContent>
        </Tabs>

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
      </div>
    </div>
  );
}

export default RecordingDetailRedesign;
