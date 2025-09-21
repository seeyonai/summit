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
import HotwordSelection from '@/components/HotwordSelection';
import type { Recording, Meeting } from '@/types';
import { apiService } from '@/services/api';
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
  CheckCircleIcon,
  MicIcon,
  UsersIcon
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
  const [activeTab, setActiveTab] = useState('transcription');
  const [transcribing, setTranscribing] = useState(false);
  const [segmenting, setSegmenting] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [showHotwordSelection, setShowHotwordSelection] = useState(false);

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

  const generateTranscription = async () => {
    try {
      setTranscribing(true);
      const { message } = await apiService.transcribeRecording(recording._id);
      await fetchRecording();
      setSuccess(message || '转录生成成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTranscribing(false);
    }
  };

  const runSpeakerSegmentation = async (oracleNumSpeakers?: number) => {
    try {
      setSegmenting(true);
      const hasHint = typeof oracleNumSpeakers === 'number' && !Number.isNaN(oracleNumSpeakers);
      const { message } = await apiService.segmentRecording(
        recording._id,
        hasHint ? { oracleNumSpeakers } : {}
      );
      await fetchRecording();
      setSuccess(message || '说话人分离完成');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSegmenting(false);
    }
  };

  const polishTranscription = async () => {
    try {
      setPolishing(true);
      const { message } = await apiService.polishRecording(recording._id);
      await fetchRecording();
      setSuccess(message || '转录优化成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPolishing(false);
    }
  };

  const handleHotwordTranscribe = () => {
    setShowHotwordSelection(false);
    generateTranscription();
  };

  const renderSpeakerTimeline = () => {
    if (!recording?.speakerSegments || recording.speakerSegments.length === 0) {
      return null;
    }

    const maxTime = Math.max(...recording.speakerSegments.map(s => s.endTime));
    const speakerColors = [
      'bg-gradient-to-r from-blue-500/30 to-blue-600/30',
      'bg-gradient-to-r from-green-500/30 to-green-600/30',
      'bg-gradient-to-r from-yellow-500/30 to-yellow-600/30',
      'bg-gradient-to-r from-purple-500/30 to-purple-600/30',
      'bg-gradient-to-r from-pink-500/30 to-pink-600/30'
    ];
    
    return (
      <div className="space-y-4">
        <div className="relative h-20 bg-gray-100 rounded-xl overflow-hidden">
          {recording.speakerSegments.map((segment, index) => {
            const left = (segment.startTime / maxTime) * 100;
            const width = ((segment.endTime - segment.startTime) / maxTime) * 100;
            const colorClass = speakerColors[segment.speakerIndex % speakerColors.length];
            
            return (
              <div
                key={index}
                className={`absolute top-0 h-full ${colorClass} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`说话人 ${segment.speakerIndex + 1}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
              />
            );
          })}
          <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
            <span className="text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">0:00</span>
            <span className="text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">{formatTime(maxTime)}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(recording.speakerSegments.map(s => s.speakerIndex))).map(speakerIndex => (
            <Badge
              key={speakerIndex}
              className={`${speakerColors[speakerIndex % speakerColors.length]} text-white`}
            >
              <UsersIcon className="w-3 h-3 mr-1" />
              说话人 {speakerIndex + 1}
            </Badge>
          ))}
        </div>
      </div>
    );
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">转录状态</p>
                  <p className="text-2xl font-bold">
                    {recording.transcription ? '已完成' : '未转录'}
                  </p>
                </div>
                {recording.transcription ? (
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertCircleIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">说话人数</p>
                  <p className="text-2xl font-bold">
                    {recording.numSpeakers || (recording.speakerSegments ? new Set(recording.speakerSegments.map(s => s.speakerIndex)).size : 0)}
                  </p>
                </div>
                <UsersIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">音频格式</p>
                  <p className="text-2xl font-bold">{recording.format || 'WAV'}</p>
                </div>
                <FileAudioIcon className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">采样率</p>
                  <p className="text-2xl font-bold">
                    {recording.sampleRate ? `${recording.sampleRate / 1000}k` : '-'}
                  </p>
                </div>
                <ActivityIcon className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Speaker Timeline */}
        {recording.speakerSegments && recording.speakerSegments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>说话人时间线</CardTitle>
              <CardDescription>可视化展示不同说话人的发言时段</CardDescription>
            </CardHeader>
            <CardContent>
              {renderSpeakerTimeline()}
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="transcription">转录</TabsTrigger>
            <TabsTrigger value="analysis">分析</TabsTrigger>
            <TabsTrigger value="details">详情</TabsTrigger>
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

        {/* Hotword Selection Modal */}
        {showHotwordSelection && (
          <HotwordSelection
            isOpen={showHotwordSelection}
            onClose={() => setShowHotwordSelection(false)}
            onApply={handleHotwordTranscribe}
            currentHotwords={recording.transcription ? [recording.transcription] : []}
          />
        )}
      </div>
    </div>
  );
}

export default RecordingDetailRedesign;
