import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useMeetingDetail } from '@/hooks/useMeetingDetail';
import { useTodoAdvice } from '@/hooks/useTodoAdvice';
import { formatDate } from '@/utils/date';
import MeetingOverview from './components/MeetingOverview';
import MeetingTranscript from './components/MeetingTranscript';
import MeetingRecordings from './components/MeetingRecordings';
import MeetingTasks from './components/MeetingTasks';
import MeetingAnalysis from './components/MeetingAnalysis';
import TranscriptDialog from '@/components/meetings/TranscriptDialog';
import AdviceDialog from '@/components/meetings/AdviceDialog';
import {
  ArrowLeftIcon,
  EditIcon,
  TrashIcon,
  MoreVerticalIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  AlertCircleIcon,
  MicIcon,
  PlayIcon,
  PauseIcon,
  BrainIcon
} from 'lucide-react';

// Lazy load heavy components
const RealTimeSpeechRecognition = lazy(() => 
  import('@/components/Audio').then(m => ({ default: m.RealTimeSpeechRecognition }))
);

function MeetingDetailRedesigned() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [success, setSuccess] = useState<string | null>(null);
  const [showAnalysisSuccess, setShowAnalysisSuccess] = useState(false);
  
  // Use custom hooks
  const {
    meeting,
    loading,
    error,
    showTranscript,
    showCombinedRecording,
    setShowTranscript,
    setShowCombinedRecording,
    deleteMeeting,
    handleRecordingComplete,
  } = useMeetingDetail(id);

  const {
    adviceById,
    loadingById,
    selectedTodoId,
    generateAdvice,
    setSelectedTodoId,
  } = useTodoAdvice();

  // Event handlers
  const handleGenerateAdvice = useCallback((todo: any) => {
    if (!id || !todo.id) return;
    generateAdvice(id, todo.id, todo.text);
  }, [id, generateAdvice]);

  const handleDeleteMeeting = async () => {
    if (!confirm('确定要删除这个会议吗？此操作不可撤销。')) {
      return;
    }
    await deleteMeeting();
    navigate('/meetings');
  };

  const handleAnalysisComplete = useCallback(() => {
    setShowAnalysisSuccess(true);
    // Trigger meeting refresh to get updated data
    setTimeout(() => {
      setShowAnalysisSuccess(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'scheduled': return '已安排';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return status || '未知';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'scheduled': return CalendarIcon;
      case 'in_progress': return PlayIcon;
      case 'completed': return PauseIcon;
      default: return ClockIcon;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/20 via-white/20 to-gray-50/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/20 via-white/20 to-gray-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error || '会议不存在'}</AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate('/meetings')}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回会议列表
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(meeting.status);
  const canRecord = meeting.status === 'in_progress';
  const recordingsToShow = showCombinedRecording && meeting.combinedRecording
    ? [meeting.combinedRecording]
    : meeting.recordings || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/20 via-white/20 to-gray-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/meetings')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回列表
          </Button>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{meeting.title}</h1>
                  <Badge variant="outline" className={getStatusColor(meeting.status)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {getStatusText(meeting.status)}
                  </Badge>
                </div>
                <p className="text-gray-600">{meeting.summary || '暂无概要'}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {formatDate(meeting.scheduledStart)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    最近更新: {formatDate(meeting.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <UsersIcon className="w-4 h-4" />
                    {meeting.participants || 0} 人参与
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/meetings/${meeting._id}/edit`)}
                  variant="outline"
                >
                  <EditIcon className="w-4 h-4 mr-2" />
                  编辑
                </Button>
                <Button
                  onClick={handleDeleteMeeting}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  删除
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                >
                  <MoreVerticalIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Real-time Recording for In-Progress Meetings */}
            {canRecord && (
              <div className="bg-gradient-to-r from-green-50/20 to-emerald-50/20 rounded-xl p-6 border border-green-200/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                      <MicIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">实时录音</h3>
                      <p className="text-sm text-gray-600">会议正在进行中，可以开始录音</p>
                    </div>
                  </div>
                </div>
                <Suspense fallback={
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                }>
                  <RealTimeSpeechRecognition
                    meetingId={meeting._id}
                    onRecordingComplete={handleRecordingComplete}
                    isDisabled={!canRecord}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl mx-auto">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="transcript">转录</TabsTrigger>
            <TabsTrigger value="recordings">录音</TabsTrigger>
            <TabsTrigger value="tasks">任务</TabsTrigger>
            <TabsTrigger value="analysis">分析</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <MeetingOverview 
              meeting={meeting}
            />
          </TabsContent>

          <TabsContent value="transcript">
            <MeetingTranscript
              meeting={meeting}
            />
          </TabsContent>

          <TabsContent value="recordings">
            <MeetingRecordings
              meeting={meeting}
              onViewTranscript={() => setShowTranscript(true)}
            />
          </TabsContent>

          <TabsContent value="tasks">
            <MeetingTasks
              meeting={meeting}
              onGenerateAdvice={handleGenerateAdvice}
              generatingAdvice={loadingById}
            />
          </TabsContent>

          <TabsContent value="analysis">
            <MeetingAnalysis
              meeting={meeting}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </TabsContent>
        </Tabs>

        {/* Transcript Dialog */}
        <TranscriptDialog
          open={showTranscript}
          onOpenChange={setShowTranscript}
          title={meeting.title}
          recordings={recordingsToShow}
          showCombinedRecording={showCombinedRecording}
          combinedRecording={meeting.combinedRecording}
        />

        {/* Advice Dialog */}
        <AdviceDialog
          open={!!selectedTodoId}
          onOpenChange={(open) => !open && setSelectedTodoId(null)}
          todoText={selectedTodoId ? meeting.parsedTodos?.find(t => t.id === selectedTodoId)?.text : undefined}
          advice={selectedTodoId ? adviceById[selectedTodoId] : undefined}
          loading={selectedTodoId ? loadingById[selectedTodoId] : false}
          onRegenerate={selectedTodoId ? () => {
            const todo = meeting.parsedTodos?.find(t => t.id === selectedTodoId);
            if (todo && id) generateAdvice(id, selectedTodoId, todo.text);
          } : undefined}
        />

        {/* Success Message */}
        {success && (
          <div className="fixed bottom-4 right-4 z-50">
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Analysis Success Message */}
        {showAnalysisSuccess && (
          <div className="fixed bottom-4 right-4 z-50">
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <BrainIcon className="h-4 w-4" />
              <AlertDescription>AI 分析完成！任务和争议问题已提取并保存。</AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingDetailRedesigned;
