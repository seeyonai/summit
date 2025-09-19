import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiService, apiUrl } from '@/services/api';
import { formatDuration, formatFileSize, formatDate } from '@/utils/formatHelpers';
import type { Recording, Meeting } from '@/types';
import {
  MicIcon,
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  TrashIcon,
  LinkIcon,
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  ClockIcon,
  FileAudioIcon,
  RefreshCwIcon,
  GridIcon,
  ListIcon,
  ChevronRightIcon,
  Volume2Icon,
  ActivityIcon,
  SparklesIcon,
  FolderOpenIcon,
  MoreVerticalIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  FileTextIcon,
  UsersIcon,
  EyeIcon,
  UploadIcon
} from 'lucide-react';

const audioUrlFor = (filename: string) => apiUrl(`/files/${filename}`);

function RecordingList() {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [availableMeetings, setAvailableMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'transcribed' | 'untranscribed'>('all');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioRefs, setAudioRefs] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const deleteRecording = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
      await apiService.addRecordingToMeeting(selectedMeeting, {
        _id: selectedRecording._id,
        filePath: selectedRecording.filePath,
        filename: selectedRecording.filename,
        createdAt: selectedRecording.createdAt,
        duration: selectedRecording.duration,
        transcription: selectedRecording.transcription,
        sampleRate: selectedRecording.sampleRate,
        channels: selectedRecording.channels,
        format: selectedRecording.format,
      } as unknown as Recording);
      
      setShowAssociationModal(false);
      setSelectedRecording(null);
      setSelectedMeeting('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a', 'audio/webm'];
    if (!allowedTypes.includes(file.type)) {
      setError('不支持的文件格式。请上传 WAV、MP3、OGG、M4A 或 WEBM 格式的音频文件。');
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('文件大小超过限制。请上传小于 50MB 的音频文件。');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('audio', file);

      // Create XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          setUploading(false);
          setUploadProgress(0);
          fetchRecordings(); // Refresh the recordings list
          // Reset file input
          event.target.value = '';
        } else {
          throw new Error('上传失败');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('网络错误，上传失败');
      });

      xhr.open('POST', `${apiUrl('')}/recordings/upload`);
      xhr.send(formData);

    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const openAssociationModal = (recording: Recording, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRecording(recording);
    fetchMeetings();
    setShowAssociationModal(true);
  };

  const toggleAudioPlayback = (recordingId: string, audioUrl: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (playingAudio === recordingId) {
      audioRefs[recordingId]?.pause();
      setPlayingAudio(null);
    } else {
      // Pause any currently playing audio
      if (playingAudio && audioRefs[playingAudio]) {
        audioRefs[playingAudio].pause();
      }
      
      // Create or get audio element
      if (!audioRefs[recordingId]) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingAudio(null);
        setAudioRefs(prev => ({ ...prev, [recordingId]: audio }));
        audio.play();
      } else {
        audioRefs[recordingId].play();
      }
      
      setPlayingAudio(recordingId);
    }
  };

  // Filtered recordings based on search and filter
  const filteredRecordings = useMemo(() => {
    return recordings.filter(recording => {
      const matchesSearch = searchQuery === '' || 
        recording.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.transcription?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' ||
        (filterStatus === 'transcribed' && recording.transcription) ||
        (filterStatus === 'untranscribed' && !recording.transcription);
      
      return matchesSearch && matchesFilter;
    });
  }, [recordings, searchQuery, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const totalDuration = recordings.reduce((acc, r) => acc + (r.duration || 0), 0);
    const totalSize = recordings.reduce((acc, r) => acc + (r.fileSize || 0), 0);
    const transcribedCount = recordings.filter(r => r.transcription).length;
    
    return {
      total: recordings.length,
      totalDuration,
      totalSize,
      transcribedCount,
      transcriptionRate: recordings.length > 0 ? (transcribedCount / recordings.length) * 100 : 0
    };
  }, [recordings]);

  const RecordingCard = ({ recording }: { recording: Recording }) => (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-200 hover:border-blue-300 overflow-hidden"
      onClick={() => navigate(`/recordings/${recording._id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {recording.filename}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {formatDate(recording.createdAt)}
            </CardDescription>
            {/* Meeting Information */}
            {recording.meeting && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">会议:</span>
                <span className="text-xs font-medium text-gray-700 truncate">{recording.meeting.title}</span>
                <Badge 
                  variant="outline"
                  className={
                    recording.meeting.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                    recording.meeting.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    recording.meeting.status === 'scheduled' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }
                >
                  {recording.meeting.status === 'completed' ? '已完成' :
                   recording.meeting.status === 'in_progress' ? '进行中' :
                   recording.meeting.status === 'scheduled' ? '已安排' : '失败'}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {recording.transcription && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <CheckCircleIcon className="w-3 h-3 mr-1" />
                已转录
              </Badge>
            )}
            {recording.speakerSegments && recording.speakerSegments.length > 0 && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                <UsersIcon className="w-3 h-3 mr-1" />
                {recording.numSpeakers || '多'}人
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Audio Waveform Visualization */}
        <div className="relative h-16 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center gap-1 px-4">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-blue-400/60 to-indigo-400/60 rounded-full opacity-40"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
          <button
            onClick={(e) => toggleAudioPlayback(recording._id, audioUrlFor(recording.filename), e)}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors"
          >
            <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
              {playingAudio === recording._id ? (
                <PauseIcon className="w-5 h-5 text-blue-600" />
              ) : (
                <PlayIcon className="w-5 h-5 text-blue-600 ml-1" />
              )}
            </div>
          </button>
        </div>

        {/* Recording Info */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <ClockIcon className="w-3 h-3" />
            <span>{formatDuration(recording.duration || 0)}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <FolderOpenIcon className="w-3 h-3" />
            <span>{formatFileSize(recording.fileSize || 0)}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <FileAudioIcon className="w-3 h-3" />
            <span>{recording.format || 'WAV'}</span>
          </div>
        </div>

        {/* Transcription Preview */}
        {recording.transcription && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1 font-medium">转录预览</p>
            <p className="text-xs text-gray-700 line-clamp-2">
              {recording.transcription}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/recordings/${recording._id}`);
            }}
          >
            <EyeIcon className="w-3 h-3 mr-1" />
            查看
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => openAssociationModal(recording, e)}
          >
            <LinkIcon className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              window.open(audioUrlFor(recording.filename), '_blank');
            }}
          >
            <DownloadIcon className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => deleteRecording(recording._id, e)}
          >
            <TrashIcon className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const RecordingListItem = ({ recording }: { recording: Recording }) => (
    <div 
      className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 p-4 cursor-pointer"
      onClick={() => navigate(`/recordings/${recording._id}`)}
    >
      <div className="flex items-center gap-4">
        {/* Play Button */}
        <button
          onClick={(e) => toggleAudioPlayback(recording._id, audioUrlFor(recording.filename), e)}
          className="w-12 h-12 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform"
        >
          {playingAudio === recording._id ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Recording Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{recording.filename}</h3>
            {recording.transcription && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                已转录
              </Badge>
            )}
            {recording.speakerSegments && recording.speakerSegments.length > 0 && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                {recording.numSpeakers || '多'}人对话
              </Badge>
            )}
            {/* Meeting Status Badge */}
            {recording.meeting && (
              <Badge 
                variant="outline"
                className={
                  recording.meeting.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                  recording.meeting.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  recording.meeting.status === 'scheduled' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                  'bg-red-50 text-red-600 border-red-200'
                }
              >
                {recording.meeting.status === 'completed' ? '已完成' :
                 recording.meeting.status === 'in_progress' ? '进行中' :
                 recording.meeting.status === 'scheduled' ? '已安排' : '失败'}
              </Badge>
            )}
          </div>
          {/* Meeting Title */}
          {recording.meeting && (
            <div className="mb-1">
              <span className="text-sm text-gray-500">会议: </span>
              <span className="text-sm font-medium text-gray-700">{recording.meeting.title}</span>
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {formatDate(recording.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {formatDuration(recording.duration || 0)}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpenIcon className="w-3 h-3" />
              {formatFileSize(recording.fileSize || 0)}
            </span>
          </div>
          {recording.transcription && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-1">
              {recording.transcription}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => openAssociationModal(recording, e)}
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              window.open(audioUrlFor(recording.filename), '_blank');
            }}
          >
            <DownloadIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => deleteRecording(recording._id, e)}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
        {/* Header Section with Stats */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/90 to-indigo-600/90 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">录音管理中心</h1>
                <p className="text-blue-100 text-lg">智能管理和分析您的音频记录</p>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    disabled={uploading || recording}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    id="audio-upload"
                  />
                  <Button
                    asChild
                    disabled={uploading || recording}
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-300 shadow-lg disabled:opacity-50"
                  >
                    <label htmlFor="audio-upload" className="cursor-pointer">
                      {uploading ? (
                        <>
                          <div className="w-3 h-3 bg-blue-600 rounded-full animate-spin mr-2" />
                          上传中... {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-5 h-5 mr-2" />
                          上传音频
                        </>
                      )}
                    </label>
                  </Button>
                </div>
                <Button
                  onClick={startRecording}
                  disabled={recording || uploading}
                  size="lg"
                  className={`${recording ? 'bg-red-500 hover:bg-red-600' : 'bg-white text-blue-600 hover:bg-blue-50'} transition-all duration-300 shadow-lg disabled:opacity-50`}
                >
                  {recording ? (
                    <>
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse mr-2" />
                      录音中...
                    </>
                  ) : (
                    <>
                      <MicIcon className="w-5 h-5 mr-2" />
                      快速录音
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">总录音数</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <FileAudioIcon className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">总时长</p>
                    <p className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">转录率</p>
                    <p className="text-2xl font-bold">{stats.transcriptionRate.toFixed(0)}%</p>
                  </div>
                  <ActivityIcon className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">存储空间</p>
                    <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
                  </div>
                  <FolderOpenIcon className="w-8 h-8 text-blue-200" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="搜索录音文件或转录内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-11 border-gray-200 focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[180px] h-11">
                  <FilterIcon className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="筛选状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部录音</SelectItem>
                  <SelectItem value="transcribed">已转录</SelectItem>
                  <SelectItem value="untranscribed">未转录</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex border border-gray-200 rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <GridIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <ListIcon className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                onClick={fetchRecordings}
                variant="outline"
                size="default"
                className="h-11"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-4" />
                <Skeleton className="h-16 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Recordings Grid/List */}
        {!loading && !error && filteredRecordings.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecordings.map((recording) => (
                <RecordingCard key={recording._id} recording={recording} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecordings.map((recording) => (
                <RecordingListItem key={recording._id} recording={recording} />
              ))}
            </div>
          )
        )}

        {/* Empty State */}
        {!loading && !error && filteredRecordings.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <FileAudioIcon className="w-full h-full" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterStatus !== 'all' ? '没有找到匹配的录音' : '暂无录音'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || filterStatus !== 'all' 
                  ? '尝试调整搜索条件或筛选器'
                  : '点击"快速录音"开始录制您的第一个录音'}
              </p>
              {(searchQuery || filterStatus !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                  }}
                >
                  清除筛选
                </Button>
              )}
            </div>
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
}

export default RecordingList;
