import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import SearchInput from '@/components/SearchInput';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { apiService } from '@/services/api';
import type { MeetingCreate } from '@/types';
import { useMeetings } from '@/hooks/useMeetings';
import MeetingCard from './components/MeetingCard';
import MeetingListItem from './components/MeetingListItem';
import {
  Mic,
  Calendar,
  CheckCircle,
  PlusIcon,
  FilterIcon,
  RefreshCwIcon,
  GridIcon,
  ListIcon,
  AlertCircleIcon,
  ActivityIcon,
  FolderOpenIcon,
  TargetIcon
} from 'lucide-react';

function MeetingList() {
  const navigate = useNavigate();
  const { meetings, loading, error, refetch, fetchedAll, loadAll } = useMeetings();
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


  return (
    <div className="space-y-8">
        {/* Header Section with Stats */}
        <div className="page-header">
          <div className="page-header-content">
            <div className="flex justify-between items-start mb-6">
              <div className="page-header-title">
                <h1>会议</h1>
                <p>智能管理您的会议记录和任务进度</p>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="lg"
                className="bg-background text-primary hover:bg-primary/10 transition-all duration-300 shadow-lg"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                创建会议
              </Button>
            </div>
            
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">总会议数</p>
                    <p className="stat-value">{stats.total}</p>
                  </div>
                  <FolderOpenIcon className="stat-icon" />
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">进行中</p>
                    <p className="stat-value">{stats.inProgressCount}</p>
                  </div>
                  <ActivityIcon className="stat-icon" />
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">任务完成率</p>
                    <p className="stat-value">{stats.todoCompletionRate.toFixed(0)}%</p>
                  </div>
                  <TargetIcon className="stat-icon" />
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">总录音数</p>
                    <p className="stat-value">{stats.totalRecordings}</p>
                  </div>
                  <Mic className="stat-icon" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="header-decoration header-decoration-top-right" />
          <div className="header-decoration header-decoration-bottom-left" />
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <SearchInput
            className="flex-1"
            placeholder="搜索会议标题或概要..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          
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
            
            <div className="flex border border-border dark:border-border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className={`rounded-r-none ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : ''}`}
              >
                <GridIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className={`rounded-l-none ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : ''}`}
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

        {/* Truncation hint */}
        {!loading && !error && fetchedAll === false && (
          <Alert>
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>显示最新 100 条会议</AlertTitle>
            <AlertDescription>
              为提升性能，仅展示最近创建的 100 条会议。您可以
              <Button variant="link" className="px-1" onClick={() => loadAll()}>点击这里加载全部</Button>
              。
            </AlertDescription>
          </Alert>
        )}

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
                <MeetingCard key={meeting._id} meeting={meeting} onDelete={deleteMeeting} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMeetings.map((meeting) => (
                <MeetingListItem key={meeting._id} meeting={meeting} onDelete={deleteMeeting} />
              ))}
            </div>
          )
        )}

        {/* Empty State */}
        {!loading && !error && filteredMeetings.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-muted-foreground dark:text-muted-foreground mb-4">
                <Calendar className="w-full h-full" />
              </div>
              <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">
                {searchQuery || filterStatus !== 'all' ? '没有找到匹配的会议' : '暂无会议'}
              </h3>
              <p className="text-muted-foreground dark:text-muted-foreground mb-6">
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
