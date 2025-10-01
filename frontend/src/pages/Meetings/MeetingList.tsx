import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiService } from '@/services/api';
import { formatDate } from '@/utils/date';
import type { Meeting, MeetingStatus, MeetingCreate } from '@/types';
import { useMeetings } from '@/hooks/useMeetings';
import {
  Users,
  Mic,
  Calendar,
  Clock,
  CheckCircle,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  RefreshCwIcon,
  GridIcon,
  ListIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  FileTextIcon,
  ActivityIcon,
  FolderOpenIcon,
  TrashIcon,
  PlayIcon,
  EyeIcon,
  TargetIcon
} from 'lucide-react';

function MeetingList() {
  const navigate = useNavigate();
  const { meetings, loading, error, refetch } = useMeetings();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');
  
  const getTomorrow9AM = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  };

  const formatDateTimeLocal = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [newMeeting, setNewMeeting] = useState<MeetingCreate>({
    title: '',
    scheduledStart: getTomorrow9AM(),
    participants: 5
  });

  const createMeeting = async (meetingData: MeetingCreate) => {
    try {
      await apiService.createMeeting(meetingData);
      refetch();
      setShowCreateModal(false);
      setNewMeeting({
        title: '',
        scheduledStart: getTomorrow9AM(),
        participants: 5
      });
    } catch (err) {
      console.error('Error creating meeting:', err);
    }
  };

  const deleteMeeting = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('确定要删除这个会议吗？此操作不可撤销。')) {
      return;
    }

    try {
      await apiService.deleteMeeting(id);
      refetch();
    } catch (err) {
      console.error('Error deleting meeting:', err);
    }
  };

  const handleCreateMeeting = () => {
    createMeeting(newMeeting);
  };

  // Filtered meetings based on search and filter
  const filteredMeetings = useMemo(() => {
    return (meetings || [])
      .filter(meeting => {
        const matchesSearch = searchQuery === '' || 
          meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          meeting.summary?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesFilter = filterStatus === 'all' ||
          meeting.status === filterStatus;
        
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        // Sort by most recently updated (use createdAt or updatedAt if available, fallback to scheduledStart)
        const dateA = a.updatedAt || a.createdAt || a.scheduledStart;
        const dateB = b.updatedAt || b.createdAt || b.scheduledStart;
        const timeA = dateA ? new Date(dateA as string | number | Date).getTime() : 0;
        const timeB = dateB ? new Date(dateB as string | number | Date).getTime() : 0;
        return timeB - timeA;
      });
  }, [meetings, searchQuery, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const scheduledCount = meetings.filter(m => m.status === 'scheduled').length;
    const inProgressCount = meetings.filter(m => m.status === 'in_progress').length;
    const completedCount = meetings.filter(m => m.status === 'completed').length;
    const totalRecordings = meetings.reduce((acc, m) => acc + (m.recordings?.length || 0), 0);
    const totalTodos = meetings.reduce((acc, m) => acc + (m.parsedTodos?.length || 0), 0);
    const completedTodos = meetings.reduce((acc, m) => 
      acc + (m.parsedTodos?.filter(t => t.completed).length || 0), 0);
    
    return {
      total: meetings.length,
      scheduledCount,
      inProgressCount,
      completedCount,
      totalRecordings,
      totalTodos,
      completedTodos,
      todoCompletionRate: totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0
    };
  }, [meetings]);

  const getStatusColor = (status: MeetingStatus) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'in_progress': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'completed': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusText = (status: MeetingStatus) => {
    switch (status) {
      case 'scheduled': return '已排期';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return status;
    }
  };

  const getStatusIcon = (status: MeetingStatus) => {
    switch (status) {
      case 'scheduled': return Calendar;
      case 'in_progress': return PlayIcon;
      case 'completed': return CheckCircle;
      default: return Clock;
    }
  };

  const MeetingCard = ({ meeting }: { meeting: Meeting }) => {
    const StatusIcon = getStatusIcon(meeting.status);
    const totalTodos = meeting.parsedTodos?.length || 0;

    return (
      <Card 
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-400 overflow-hidden"
        onClick={() => navigate(`/meetings/${meeting._id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold truncate">
                {meeting.title}
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                {formatDate(meeting.scheduledStart)}
              </CardDescription>
            </div>
            <Badge variant="outline" className={getStatusColor(meeting.status)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {getStatusText(meeting.status)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Meeting Summary */}
          {meeting.summary && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                {meeting.summary}
              </p>
            </div>
          )}

  
          {/* Meeting Info */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Users className="w-3 h-3" />
              <span>{meeting.participants || 0} 人</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Mic className="w-3 h-3" />
              <span>{meeting.recordings?.length || 0} 录音</span>
            </div>
            {totalTodos > 0 ? (
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <TargetIcon className="w-3 h-3" />
                <span>{totalTodos} 任务</span>
              </div>
            ) : meeting.agenda && meeting.agenda.length > 0 ? (
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <FileTextIcon className="w-3 h-3" />
                <span>{meeting.agenda.length} 议程</span>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/meetings/${meeting._id}`);
              }}
            >
              <EyeIcon className="w-3 h-3 mr-1" />
              查看详情
            </Button>
            {meeting.status === 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                className="bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-800/30 dark:text-green-400"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/meetings/${meeting._id}`);
                }}
              >
                <Mic className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={(e) => deleteMeeting(meeting._id, e)}
            >
              <TrashIcon className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const MeetingListItem = ({ meeting }: { meeting: Meeting }) => {
    const StatusIcon = getStatusIcon(meeting.status);
    const completedTodos = meeting.parsedTodos?.filter(t => t.completed).length || 0;
    const totalTodos = meeting.parsedTodos?.length || 0;

    return (
      <div 
        className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-400 hover:shadow-md transition-all duration-300 p-4 cursor-pointer"
        onClick={() => navigate(`/meetings/${meeting._id}`)}
      >
        <div className="flex items-center gap-4">
          {/* Status Icon */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            meeting.status === 'in_progress' ? 'bg-gradient-to-r from-green-500/80 to-green-600/80' :
            meeting.status === 'completed' ? 'bg-gradient-to-r from-gray-400/80 to-gray-500/80' :
            'bg-gradient-to-r from-primary/80 to-blue-500/80'
          } text-white`}>
            <StatusIcon className="w-5 h-5" />
          </div>

          {/* Meeting Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{meeting.title}</h3>
              <Badge variant="outline" className={getStatusColor(meeting.status)}>
                {getStatusText(meeting.status)}
              </Badge>
              {totalTodos > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400">
                  {completedTodos}/{totalTodos} 任务
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(meeting.scheduledStart)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {meeting.participants || 0} 人
              </span>
              <span className="flex items-center gap-1">
                <Mic className="w-3 h-3" />
                {meeting.recordings?.length || 0} 录音
              </span>
            </div>
            {meeting.summary && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                {meeting.summary}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {meeting.status === 'in_progress' && (
              <Button
                size="sm"
                variant="ghost"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/meetings/${meeting._id}`);
                }}
              >
                <Mic className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={(e) => deleteMeeting(meeting._id, e)}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
            <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
        {/* Header Section with Stats */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 to-blue-600/90 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">会议</h1>
                <p className="text-blue-100 text-lg">智能管理您的会议记录和任务进度</p>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-300 shadow-lg"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                创建会议
              </Button>
            </div>
            
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">总会议数</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <FolderOpenIcon className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">进行中</p>
                    <p className="text-2xl font-bold">{stats.inProgressCount}</p>
                  </div>
                  <ActivityIcon className="w-8 h-8 text-green-300" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">任务完成率</p>
                    <p className="text-2xl font-bold">{stats.todoCompletionRate.toFixed(0)}%</p>
                  </div>
                  <TargetIcon className="w-8 h-8 text-purple-200" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">总录音数</p>
                    <p className="text-2xl font-bold">{stats.totalRecordings}</p>
                  </div>
                  <Mic className="w-8 h-8 text-pink-200" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <Input
                type="text"
                placeholder="搜索会议标题或概要..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-11 border-gray-200 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400 transition-colors"
              />
            </div>
            
            <div className="flex gap-2 items-center">
              <Select value={filterStatus} onValueChange={(value: 'all' | 'scheduled' | 'in_progress' | 'completed') => setFilterStatus(value)}>
                <SelectTrigger className="w-[180px] h-11">
                  <FilterIcon className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="筛选状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部会议</SelectItem>
                  <SelectItem value="scheduled">已排期</SelectItem>
                  <SelectItem value="in_progress">进行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex border border-gray-200 dark:border-gray-600 rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <GridIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <ListIcon className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                onClick={refetch}
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

        {/* Meetings Grid/List */}
        {!loading && !error && filteredMeetings.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetings.map((meeting) => (
                <MeetingCard key={meeting._id} meeting={meeting} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMeetings.map((meeting) => (
                <MeetingListItem key={meeting._id} meeting={meeting} />
              ))}
            </div>
          )
        )}

        {/* Empty State */}
        {!loading && !error && filteredMeetings.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
                <Calendar className="w-full h-full" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchQuery || filterStatus !== 'all' ? '没有找到匹配的会议' : '暂无会议'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchQuery || filterStatus !== 'all' 
                  ? '尝试调整搜索条件或筛选器'
                  : '点击"创建会议"开始您的第一个会议'}
              </p>
              {(searchQuery || filterStatus !== 'all') ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                  }}
                >
                  清除筛选
                </Button>
              ) : (
                <Button onClick={() => setShowCreateModal(true)}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  创建会议
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Create Meeting Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
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
                <Label htmlFor="start-time">开始时间</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={newMeeting.scheduledStart ? formatDateTimeLocal(newMeeting.scheduledStart) : ''}
                  onChange={(e) => setNewMeeting({...newMeeting, scheduledStart: e.target.value ? new Date(e.target.value) : undefined})}
                />
              </div>

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
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
              <Button onClick={handleCreateMeeting}>
                <CheckCircle className="w-4 h-4 mr-2" />
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}

export default MeetingList;
