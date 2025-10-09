import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchInput from '@/components/SearchInput';
import { ButtonGroup } from '@/components/ui/button-group';
import { Skeleton } from '@/components/ui/skeleton';
import { apiService } from '@/services/api';
import type { MeetingCreate } from '@/types';
import { useMeetings } from '@/hooks/useMeetings';
import MeetingForm from '@/components/meetings/MeetingForm';
import MeetingCard from './components/MeetingCard';
import MeetingListItem from './components/MeetingListItem';
import {
  ItemGroup,
  ItemSeparator
} from '@/components/ui/item';
import PageHeader from '@/components/PageHeader';
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
  TargetIcon,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

function MeetingList() {
  const navigate = useNavigate();
  const { meetings, loading, error, refetch, fetchedAll, loadAll } = useMeetings();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createVariant, setCreateVariant] = useState<'scheduled' | 'quick'>('scheduled');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['completed']));

  const openCreateModal = (variant: 'scheduled' | 'quick') => {
    setCreateVariant(variant);
    setCreateError(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateVariant('scheduled');
    setCreateError(null);
  };

  const createMeeting = async (meetingData: MeetingCreate) => {
    const isQuickCreation = createVariant === 'quick';
    try {
      setCreating(true);
      setCreateError(null);

      const createdMeeting = await apiService.createMeeting(meetingData);
      const meetingId = createdMeeting?._id;

      if (isQuickCreation && meetingId) {
        closeCreateModal();
        navigate(`/meetings/${meetingId}`);
        return;
      }

      refetch();
      closeCreateModal();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error creating meeting');
    } finally {
      setCreating(false);
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

  // Filtered meetings based on search and filter
  const filteredMeetings = useMemo(() => {
    // Define status priority: in_progress > scheduled > completed > others
    const statusPriority = {
      in_progress: 1,
      scheduled: 2,
      completed: 3
    };
    
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
        // First, sort by status priority
        const priorityA = statusPriority[a.status as keyof typeof statusPriority] || 999;
        const priorityB = statusPriority[b.status as keyof typeof statusPriority] || 999;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // Within same status, sort by most recently updated
        const dateA = a.updatedAt || a.createdAt || a.scheduledStart;
        const dateB = b.updatedAt || b.createdAt || b.scheduledStart;
        const timeA = dateA ? new Date(dateA as string | number | Date).getTime() : 0;
        const timeB = dateB ? new Date(dateB as string | number | Date).getTime() : 0;
        return timeB - timeA;
      });
  }, [meetings, searchQuery, filterStatus]);

  // Group meetings by status for visual grouping
  const groupedMeetings = useMemo(() => {
    const groups: { status: string; label: string; icon: React.ElementType; meetings: typeof filteredMeetings }[] = [];
    
    const inProgress = filteredMeetings.filter(m => m.status === 'in_progress');
    const scheduled = filteredMeetings.filter(m => m.status === 'scheduled');
    const completed = filteredMeetings.filter(m => m.status === 'completed');
    const others = filteredMeetings.filter(m => m.status !== 'in_progress' && m.status !== 'scheduled' && m.status !== 'completed');
    
    if (inProgress.length > 0) {
      groups.push({ status: 'in_progress', label: '进行中', icon: ActivityIcon, meetings: inProgress });
    }
    if (scheduled.length > 0) {
      groups.push({ status: 'scheduled', label: '已排期', icon: Calendar, meetings: scheduled });
    }
    if (completed.length > 0) {
      groups.push({ status: 'completed', label: '已完成', icon: CheckCircle, meetings: completed });
    }
    if (others.length > 0) {
      groups.push({ status: 'other', label: '其他', icon: FolderOpenIcon, meetings: others });
    }
    
    return groups;
  }, [filteredMeetings]);

  const toggleGroupCollapse = (status: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  // Statistics
  const stats = useMemo(() => {
    const scheduledCount = meetings.filter(m => m.status === 'scheduled').length;
    const inProgressCount = meetings.filter(m => m.status === 'in_progress').length;
    const completedCount = meetings.filter(m => m.status === 'completed').length;
    const totalRecordings = meetings.reduce((acc, m) => {
      const originals = (m.recordings || []).filter((recording) => recording.source !== 'concatenated');
      return acc + originals.length;
    }, 0);
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
        <PageHeader
          title="会议"
          subline="智能管理您的会议记录和任务进度"
          actionButtons={
            <div className="flex gap-3">
              <Button
                onClick={() => openCreateModal('scheduled')}
                size="lg"
                variant="hero"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                预约会议
              </Button>
              <Button
                onClick={() => openCreateModal('quick')}
                size="lg"
                variant="hero"
              >
                <ActivityIcon className="w-5 h-5 mr-2" />
                快速会议
              </Button>
            </div>
          }
        >
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
        </PageHeader>

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
            
            <ButtonGroup>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                size="icon"
                className="w-10 h-10"
              >
                <GridIcon className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                size="icon"
                className="w-10 h-10"
              >
                <ListIcon className="w-5 h-5" />
              </Button>
            </ButtonGroup>
            
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
          <div className="space-y-8">
            {groupedMeetings.map((group) => {
              const isCollapsed = collapsedGroups.has(group.status);
              return (
                <div key={group.status}>
                  <Button
                    variant="ghost"
                    onClick={() => toggleGroupCollapse(group.status)}
                    className="flex flex-left items-center gap-2 mb-4 text-left transition-opacity h-auto p-0 hover:bg-muted"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                    <group.icon className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">{group.label}</h2>
                    <span className="text-sm text-muted-foreground">({group.meetings.length})</span>
                  </Button>
                  {!isCollapsed && (
                    viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {group.meetings.map((meeting) => (
                          <MeetingCard key={meeting._id} meeting={meeting} onDelete={deleteMeeting} />
                        ))}
                      </div>
                    ) : (
                      <ItemGroup>
                        {group.meetings.map((meeting, index) => (
                          <div key={meeting._id}>
                            <MeetingListItem meeting={meeting} onDelete={deleteMeeting} />
                            {index < group.meetings.length - 1 && <ItemSeparator />}
                          </div>
                        ))}
                      </ItemGroup>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredMeetings.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Calendar />
              </EmptyMedia>
              <EmptyTitle>
                {searchQuery || filterStatus !== 'all' ? '没有找到匹配的会议' : '暂无会议'}
              </EmptyTitle>
              <EmptyDescription>
                {searchQuery || filterStatus !== 'all'
                  ? '尝试调整搜索条件或筛选器'
                  : '点击"创建会议"开始您的第一个会议'}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
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
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => openCreateModal('scheduled')}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    预约会议
                  </Button>
                  <Button variant="outline" onClick={() => openCreateModal('quick')}>
                    <ActivityIcon className="w-4 h-4 mr-2" />
                    快速会议
                  </Button>
                </div>
              )}
            </EmptyContent>
          </Empty>
        )}

        {/* Create Meeting Modal */}
        <Dialog
          open={showCreateModal}
          onOpenChange={(open) => {
            if (!open) {
              closeCreateModal();
              return;
            }
            setShowCreateModal(true);
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <MeetingForm
              mode="create"
              variant={createVariant}
              onSubmit={createMeeting}
              onCancel={closeCreateModal}
              loading={creating}
              error={createError}
            />
          </DialogContent>
        </Dialog>
    </div>
  );
}

export default MeetingList;
