import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Mic, CheckCircle, Circle, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RealTimeSpeechRecognition } from '@/components/Audio';
import { apiService } from '@/services/api';
import type { Meeting, MeetingUpdate } from '@/types';

const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const fetchMeeting = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await apiService.getMeeting(id);
      setMeeting(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const deleteMeeting = async () => {
    if (!id || !confirm('确定要删除这个会议吗？此操作不可撤销。')) {
      return;
    }

    try {
      await apiService.deleteMeeting(id);
      navigate('/meetings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleRecordingComplete = async (recordingData: {
    filename: string;
    downloadUrl: string;
    transcription: string;
    duration: number;
  }) => {
    if (!meeting) return;

    try {
      // Update meeting with new recording
      const updatedMeeting: MeetingUpdate = {
        ...meeting,
        recordings: [
          ...meeting.recordings,
          {
            _id: `recording_${Date.now()}`,
            filename: recordingData.filename,
            filePath: `/recordings/${recordingData.filename}`,
            createdAt: new Date(),
            duration: recordingData.duration,
            transcription: recordingData.transcription,
          }
        ]
      };
      
      await apiService.updateMeeting(meeting._id, updatedMeeting);
      await fetchMeeting();
    } catch (err) {
      console.error('Failed to update meeting with recording:', err);
    }
  };

  useEffect(() => {
    fetchMeeting();
  }, [id, fetchMeeting]);

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error || '会议不存在'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const canRecord = meeting.status === 'in_progress';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
            <Badge variant="outline" className={
              meeting.status === 'in_progress' ? 'bg-green-100 text-green-800' :
              meeting.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              meeting.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }>
              {meeting.status === 'in_progress' ? '进行中' :
               meeting.status === 'completed' ? '已完成' :
               meeting.status === 'scheduled' ? '已安排' : '失败'}
            </Badge>
          </div>
          <p className="text-muted-foreground">{meeting.description || '无描述'}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => navigate('/meetings')}
            variant="outline"
          >
            返回列表
          </Button>
          <Button
            onClick={deleteMeeting}
            variant="destructive"
          >
            删除会议
          </Button>
        </div>
      </div>

      {/* Meeting Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">计划时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{formatDate(meeting.scheduledStart)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">最近更新</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{formatDate(meeting.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">录音数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{meeting.recordings.length} 个</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">参与人数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{meeting.participants || 0} 人</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recording Section */}
      {canRecord && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              实时录音
            </CardTitle>
            <CardDescription>
              为当前会议录制音频并实时转录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RealTimeSpeechRecognition
              meetingId={meeting._id}
              onRecordingComplete={handleRecordingComplete}
              isDisabled={!canRecord}
            />
          </CardContent>
        </Card>
      )}

      {/* Recordings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                录音文件 ({meeting.recordings.length})
              </CardTitle>
              <CardDescription>
                会议相关的音频录制文件
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowTranscript(true)}
              variant="outline"
              disabled={meeting.recordings.length === 0}
            >
              查看完整转录
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {meeting.recordings.length > 0 ? (
            <div className="space-y-4">
              {meeting.recordings.map((recording, index) => (
                <div key={(recording._id && recording._id.toString()) || index} className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{recording.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {recording.duration ? `${Math.floor(recording.duration / 60)} 分钟` : '未知时长'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        播放
                      </Button>
                      <Button size="sm" variant="outline">
                        下载
                      </Button>
                    </div>
                  </div>
                  
                  {recording.transcription && (
                    <div className="mt-3 p-3 bg-background rounded border">
                      <p className="text-xs text-muted-foreground mb-1">转录内容:</p>
                      <p className="text-sm line-clamp-3">{recording.transcription}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无录音文件</p>
              {canRecord && (
                <p className="text-xs mt-1">点击上方"开始录音"按钮开始录制</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parsed Todos */}
      {meeting.parsedTodos && meeting.parsedTodos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              待办事项 ({meeting.parsedTodos.length})
            </CardTitle>
            <CardDescription>
              从会议转录中提取的待办事项
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meeting.parsedTodos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-shrink-0">
                    {todo.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-foreground'}`}>
                      {todo.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {todo.priority && (
                        <Badge variant="outline" className={`text-xs ${
                          todo.priority === 'high' ? 'border-red-500 text-red-700' :
                          todo.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                          'border-green-500 text-green-700'
                        }`}>
                          {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}优先级
                        </Badge>
                      )}
                      {todo.category && (
                        <Badge variant="secondary" className="text-xs">
                          {todo.category}
                        </Badge>
                      )}
                      {todo.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          截止: {new Date(todo.dueDate).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript Modal */}
      <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>会议完整转录</DialogTitle>
            <DialogDescription>
              {meeting.title} 的完整转录内容
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {meeting.recordings.map((recording, index) => (
              recording.transcription && (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium text-sm">{recording.filename}</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{recording.transcription}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingDetail;
