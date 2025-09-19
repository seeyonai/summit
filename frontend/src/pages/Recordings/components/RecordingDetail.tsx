import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  MoreVerticalIcon
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50/20 via-white/20 to-gray-50/20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/20 via-white/20 to-gray-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error || '录音未找到'}</AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate('/recordings')}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回录音列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/20 via-white/20 to-gray-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/recordings')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回列表
          </Button>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{recording.filename}</h1>
                
                {/* Meeting Information */}
                {recording.meeting && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">关联会议:</span>
                      <span className="font-medium text-gray-900">{recording.meeting.title}</span>
                      <Badge 
                        variant={recording.meeting.status === 'completed' ? 'default' : 
                                recording.meeting.status === 'in_progress' ? 'secondary' : 
                                recording.meeting.status === 'scheduled' ? 'outline' : 'destructive'}
                        className={
                          recording.meeting.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                          recording.meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                          recording.meeting.status === 'scheduled' ? 'bg-gray-100 text-gray-700 hover:bg-gray-100' :
                          'bg-red-100 text-red-700 hover:bg-red-100'
                        }
                      >
                        {recording.meeting.status === 'completed' ? '已完成' :
                         recording.meeting.status === 'in_progress' ? '进行中' :
                         recording.meeting.status === 'scheduled' ? '已安排' : '失败'}
                      </Badge>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {formatDate(recording.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    {recording.duration ? formatTime(recording.duration) : '未知'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileAudioIcon className="w-4 h-4" />
                    {formatFileSize(recording.fileSize)}
                  </span>
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
                    >
                      <SaveIcon className="w-4 h-4 mr-2" />
                      保存
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

            {/* Audio Player */}
            <AudioPlayer 
              recording={recording} 
              timestamps={recording.speakerSegments?.map(segment => ({
                time: segment.startTime,
                label: `说话人 ${segment.speakerIndex + 1}`
              })) || []}
            />
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
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
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </div>
        )}

        {error && (
          <div className="fixed bottom-4 right-4 z-50">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordingDetailRedesign;
