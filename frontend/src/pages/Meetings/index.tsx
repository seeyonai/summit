import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Mic, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiService } from '@/services/api';
import type { Meeting, MeetingStatus, MeetingCreate } from '@/types';

const Meetings: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState<MeetingCreate>({
    title: '',
    description: '',
    scheduledStart: undefined,
    participants: undefined
  });

  // API functions
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getMeetings();
      setMeetings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async (meetingData: MeetingCreate) => {
    try {
      await apiService.createMeeting(meetingData);
      await fetchMeetings();
      setShowCreateModal(false);
      setNewMeeting({
        title: '',
        description: '',
        scheduledStart: undefined,
        participants: undefined
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm('确定要删除这个会议吗？')) {
      return;
    }

    try {
      await apiService.deleteMeeting(id);
      await fetchMeetings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const getStatusColor = (status: MeetingStatus) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: MeetingStatus) => {
    switch (status) {
      case 'scheduled': return '已安排';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return status;
    }
  };

  const handleCreateMeeting = () => {
    createMeeting(newMeeting);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('zh-CN');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">会议管理</h1>
          <p className="text-muted-foreground">管理您的会议记录和音频文件</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={fetchMeetings}
            variant="outline"
          >
            刷新
          </Button>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  创建会议
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>创建新会议</DialogTitle>
                <DialogDescription>
                  填写会议信息以创建新的会议记录
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">会议标题</Label>
                  <Input
                    id="title"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                    placeholder="输入会议标题"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                    placeholder="输入会议描述"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-time">开始时间</Label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={newMeeting.scheduledStart ? new Date(newMeeting.scheduledStart).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setNewMeeting({...newMeeting, scheduledStart: e.target.value ? new Date(e.target.value) : undefined})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="participants">参与人数</Label>
                    <Input
                      id="participants"
                      type="number"
                      value={newMeeting.participants || ''}
                      onChange={(e) => setNewMeeting({...newMeeting, participants: e.target.value ? parseInt(e.target.value) : undefined})}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateMeeting}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    创建
                  </div>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Meeting List */}
      {!loading && !error && (
        <div className="grid gap-6">
          {meetings.map((meeting) => (
            <Card key={meeting._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{meeting.title}</CardTitle>
                    <CardDescription>{meeting.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={getStatusColor(meeting.status)}>
                      {getStatusText(meeting.status)}
                    </Badge>
                    <Button
                      onClick={() => deleteMeeting(meeting._id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">计划时间</p>
                    <p className="text-sm font-medium">{formatDate(meeting.scheduledStart)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">最近更新</p>
                    <p className="text-sm font-medium">{formatDate(meeting.updatedAt)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {meeting.participants || 0} 人
                    </div>
                    <div className="flex items-center gap-1">
                      <Mic className="w-4 h-4" />
                      {meeting.recordings.length} 个录音
                    </div>
                    {meeting.parsedTodos && meeting.parsedTodos.length > 0 && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">
                          {meeting.parsedTodos.filter(todo => todo.completed).length}/{meeting.parsedTodos.length} 任务
                        </span>
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/meetings/${meeting._id}`}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    查看详情
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && meetings.length === 0 && (
        <EmptyState
          title="暂无会议"
          description="开始创建您的第一个会议吧"
          action={
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    创建会议
                  </div>
                </Button>
              </DialogTrigger>
            </Dialog>
          }
        />
      )}
    </div>
  );
};

export default Meetings;
