import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiService } from '@/services/api';
import { formatDuration, formatFileSize, formatDate } from '@/utils/formatHelpers';
import type { Recording, Meeting } from '@/types';

const BACKEND_BASE_URL = 'http://localhost:2591';

const RecordingManagement: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [availableMeetings, setAvailableMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');

  // API functions
  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getRecordings();
      setRecordings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setRecording(true);
      await apiService.startRecording();
      
      // Simulate recording for 5 seconds
      setTimeout(() => {
        setRecording(false);
        fetchRecordings();
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setRecording(false);
    }
  };

  const deleteRecording = async (id: string) => {
    if (!confirm('确定要删除这个录音吗？此操作不可撤销。')) {
      return;
    }

    try {
      await apiService.deleteRecording(id);
      await fetchRecordings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchMeetings = async () => {
    try {
      const data = await apiService.getMeetings();
      setAvailableMeetings(data);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    }
  };

  const associateWithMeeting = async () => {
    if (!selectedRecording || !selectedMeeting) return;

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/meetings/${selectedMeeting}/recordings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: selectedRecording._id,
          filePath: selectedRecording.filePath,
          filename: selectedRecording.filename,
          createdAt: selectedRecording.createdAt,
          duration: selectedRecording.duration,
          transcription: selectedRecording.transcription,
          sampleRate: selectedRecording.sampleRate,
          channels: selectedRecording.channels,
          format: selectedRecording.format,
        }),
      });

      if (!response.ok) throw new Error('Failed to associate recording with meeting');
      
      setShowAssociationModal(false);
      setSelectedRecording(null);
      setSelectedMeeting('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const openAssociationModal = (recording: Recording) => {
    setSelectedRecording(recording);
    fetchMeetings();
    setShowAssociationModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">录音管理</h1>
          <p className="text-muted-foreground">管理您的录音文件，可稍后关联到会议</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={fetchRecordings}
            variant="outline"
          >
            刷新
          </Button>
          <Button
            onClick={startRecording}
            disabled={recording}
            variant={recording ? "destructive" : "default"}
          >
            {recording ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                录音中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                快速录音
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Recording List */}
      {!loading && !error && (
        <div className="grid gap-6">
          {recordings.map((recording) => (
            <Card key={recording._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{recording.filename}</CardTitle>
                    <CardDescription>{recording.filePath}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/recordings/${recording._id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      查看详情
                    </Link>
                    <Button
                      onClick={() => openAssociationModal(recording)}
                      variant="outline"
                      size="sm"
                    >
                      关联会议
                    </Button>
                    <Button
                      onClick={() => deleteRecording(recording._id)}
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">创建时间</p>
                    <p className="text-sm font-medium">{formatDate(recording.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">时长</p>
                    <p className="text-sm font-medium">{formatDuration(recording.duration || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">文件大小</p>
                    <p className="text-sm font-medium">{formatFileSize(recording.fileSize || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">格式</p>
                    <p className="text-sm font-medium">{recording.format || 'WAV'}</p>
                  </div>
                </div>

                {/* Transcription Preview */}
                {recording.transcription && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">转录内容：</p>
                    <p className="text-sm text-foreground line-clamp-2">{recording.transcription}</p>
                  </div>
                )}

                {/* Audio Player */}
                <div className="mt-4 flex items-center space-x-4">
                  <audio 
                    controls 
                    src={`${BACKEND_BASE_URL}/recordings/${recording.filename}`}
                    className="h-8"
                  >
                    您的浏览器不支持音频播放
                  </audio>
                  <Button 
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <a 
                      href={`${BACKEND_BASE_URL}/recordings/${recording.filename}`}
                      download
                      className="flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      下载
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && recordings.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">暂无录音</h3>
            <p className="text-muted-foreground">点击"快速录音"开始录制您的第一个录音</p>
          </CardContent>
        </Card>
      )}

      {/* Association Modal */}
      <Dialog open={showAssociationModal} onOpenChange={setShowAssociationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>关联录音到会议</DialogTitle>
            <DialogDescription>
              选择要关联的会议
            </DialogDescription>
          </DialogHeader>
          {selectedRecording && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">录音文件</p>
                <p className="font-medium">{selectedRecording.filename}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">选择会议</label>
                <Select value={selectedMeeting} onValueChange={setSelectedMeeting}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择会议" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMeetings.map((meeting) => (
                      <SelectItem key={meeting._id} value={meeting._id}>
                        {meeting.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssociationModal(false)}>
              取消
            </Button>
            <Button 
              onClick={associateWithMeeting}
              disabled={!selectedMeeting}
            >
              关联
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecordingManagement;
