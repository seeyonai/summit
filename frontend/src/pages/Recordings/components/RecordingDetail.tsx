import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AudioPlayer from '@/components/AudioPlayer';
import type { Recording, Meeting } from '@/types';
import { apiService } from '@/services/api';
import RecordingOverview from './RecordingOverview';
import RecordingTranscription from './RecordingTranscription';
import RecordingAnalysis from './RecordingAnalysis';
import RecordingDetails from './RecordingDetails';
import {
  ArrowLeftIcon,
  EditIcon,
  XIcon,
  SaveIcon,
  LinkIcon,
  CalendarIcon,
  ClockIcon,
  FileAudioIcon,
  AlertCircleIcon,
  MoreVerticalIcon,
  DownloadIcon,
  ShareIcon,
  HeadphonesIcon,
  ActivityIcon,
  BarChart3Icon,
  FileTextIcon,
  SparklesIcon,
  TrendingUpIcon,
  ZapIcon,
  CheckCircleIcon
} from 'lucide-react';


function RecordingDetailRedesign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ transcription?: string; verbatimTranscript?: string }>({});
  const [activeTab, setActiveTab] = useState('overview');

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

  // Start editing
  const startEditing = () => {
    if (!recording) return;
    
    setEditForm({
      transcription: recording.transcription,
      verbatimTranscript: recording.verbatimTranscript,
    });
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-600">加载录音详情...</p>
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircleIcon className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">录音未找到</h2>
              <p className="text-gray-600 mb-6">{error || '请求的录音不存在或已被删除'}</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => navigate('/recordings')}
              variant="ghost"
              className="hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              返回列表
            </Button>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                    >
                      <ShareIcon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>分享录音</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>下载录音</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <HeadphonesIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {recording.filename}
                      </h1>
                        
                      {/* Meeting Information */}
                      {recording.meeting && (
                        <div className="mb-3">
                          <div className="inline-flex items-center gap-2 text-sm">
                            <LinkIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">关联会议:</span>
                            <span className="font-medium text-gray-900">{recording.meeting.title}</span>
                            <Badge 
                              variant={recording.meeting.status === 'completed' ? 'default' : 
                                      recording.meeting.status === 'in_progress' ? 'secondary' : 
                                      recording.meeting.status === 'scheduled' ? 'outline' : 'destructive'}
                              className={
                                recording.meeting.status === 'completed' ? 'bg-green-100 text-green-700' :
                                recording.meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                recording.meeting.status === 'scheduled' ? 'bg-gray-100 text-gray-700' :
                                'bg-red-100 text-red-700'
                              }
                            >
                              {recording.meeting.status === 'completed' ? '已完成' :
                               recording.meeting.status === 'in_progress' ? '进行中' :
                               recording.meeting.status === 'scheduled' ? '已安排' : '失败'}
                            </Badge>
                          </div>
                        </div>
                      )}
                        
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
                    <>
                      <Button
                        onClick={cancelEditing}
                        variant="outline"
                      >
                        <XIcon className="w-4 h-4 mr-2" />
                        取消
                      </Button>
                      <Button
                        onClick={updateRecording}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <SaveIcon className="w-4 h-4 mr-2" />
                        保存更改
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={startEditing}
                        variant="outline"
                      >
                        <EditIcon className="w-4 h-4 mr-2" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                      >
                        <MoreVerticalIcon className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ActivityIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-600">音频质量</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">优秀</p>
                  <p className="text-xs text-gray-500">320 kbps</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-600">转录进度</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {recording.transcription ? '100%' : '0%'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {recording.transcription ? '已完成' : '待处理'}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileTextIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-600">字数统计</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {recording.transcription ? recording.transcription.length.toLocaleString() : 0}
                  </p>
                  <p className="text-xs text-gray-500">总字符</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUpIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-600">分析状态</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">就绪</p>
                  <p className="text-xs text-gray-500">可以分析</p>
                </div>
              </div>

              {/* Audio Player */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <HeadphonesIcon className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-700">音频播放器</h3>
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

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="transcription">转录</TabsTrigger>
            <TabsTrigger value="analysis">分析</TabsTrigger>
            <TabsTrigger value="details">详情</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <RecordingOverview 
              recording={recording}
              onRefresh={fetchRecording}
              setSuccess={setSuccess}
              setError={setError}
            />
          </TabsContent>

          <TabsContent value="transcription">
            <RecordingTranscription
              recording={recording}
              isEditing={isEditing}
              editForm={editForm}
              setEditForm={setEditForm}
              onRefresh={fetchRecording}
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

          <TabsContent value="details">
            <RecordingDetails
              recording={recording}
            />
          </TabsContent>
        </Tabs>

        {/* Success/Error Messages */}
        {success && (
          <div className="fixed bottom-4 right-4 z-50">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
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
      </div>
    </div>
  );
}

export default RecordingDetailRedesign;
