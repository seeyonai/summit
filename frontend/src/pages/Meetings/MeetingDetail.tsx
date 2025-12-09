import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMeetingDetail } from '@/hooks/useMeetingDetail';
import { useTodoAdvice } from '@/hooks/useTodoAdvice';
import useMeetingMembers from '@/hooks/useMeetingMembers';
import { useConfig } from '@/contexts/ConfigContext';
import { formatDate, isSameDay } from '@/utils/date';
import BackButton from '@/components/BackButton';
import MeetingMemberAvatars from '@/components/meetings/MeetingMemberAvatars';
import MeetingTranscript from './components/MeetingTranscript';
import MeetingRecordings from './components/MeetingRecordings';
import DisputedIssues from './components/DisputedIssues';
import MeetingTodos from './components/MeetingTodos';
import MeetingAnaylysis from './components/MeetingAnalysis';
import MeetingNotes from './components/MeetingNotes';
import TranscriptDialog from '@/components/meetings/TranscriptDialog';
import AdviceDialog from '@/components/meetings/AdviceDialog';
import {
  EditIcon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  AlertCircleIcon,
  PlayIcon,
  PauseIcon,
  SquareIcon,
  BrainIcon,
  MaximizeIcon,
  TargetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ListIcon,
  RadarIcon,
  ChevronDownIcon,
  FileEditIcon,
  ShareIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ShareMeetingDialog from '@/components/ShareMeetingDialog';

function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [success, setSuccess] = useState<string | null>(null);
  const [showAnalysisSuccess, setShowAnalysisSuccess] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'recordings';
  const activeSubtab = searchParams.get('subtab') || 'disputedIssues';
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });
  const [showShareDialog, setShowShareDialog] = useState(false);

  const { user: currentUser } = useAuth();

  // Use custom hooks
  const {
    meeting,
    loading,
    error,
    showTranscript,
    showConcatenatedRecording,
    setShowTranscript,
    setShowConcatenatedRecording,
    deleteMeeting,
    refresh,
    updateMeetingStatus,
  } = useMeetingDetail(id);

  const { adviceById, loadingById, selectedTodoId, generateAdvice, setSelectedTodoId } = useTodoAdvice();

  const {
    memberUsers,
    viewerUsers,
    ownerUser,
    loading: membersLoading,
  } = useMeetingMembers({
    meetingId: id || '',
    ownerId: meeting?.ownerId,
    members: meeting?.members || [],
    viewers: meeting?.viewers || [],
  });

  const { config } = useConfig();
  const showNotesTab = config.features?.shorthandNotes === true;

  // Check user role for this meeting
  const isOwner = !!currentUser && meeting?.ownerId === currentUser._id;
  const isMember = !!currentUser && (meeting?.members || []).includes(currentUser._id);
  const isViewer = !!currentUser && (meeting?.viewers || []).includes(currentUser._id);
  const isAdmin = !!currentUser && currentUser.role === 'admin';
  const isViewerOnly = isViewer && !isOwner && !isMember && !isAdmin;
  const canEdit = isOwner || isAdmin;

  // Redirect viewer to allowed tabs only
  useEffect(() => {
    if (isViewerOnly && activeTab !== 'transcript' && activeTab !== 'analysis') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', 'transcript');
      setSearchParams(nextParams);
    }
  }, [isViewerOnly, activeTab, searchParams, setSearchParams]);

  // Redirect if notes tab is selected but feature is disabled
  useEffect(() => {
    if (activeTab === 'notes' && !showNotesTab) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', 'recordings');
      setSearchParams(nextParams);
    }
  }, [activeTab, showNotesTab, searchParams, setSearchParams]);

  // Event handlers

  const handleDeleteMeeting = () => {
    setConfirmDialog({
      open: true,
      title: '确认删除',
      description: '确定要删除这个会议吗？此操作不可撤销。',
      onConfirm: async () => {
        await deleteMeeting();
        navigate('/meetings');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleAnalysisComplete = useCallback(() => {
    setShowAnalysisSuccess(true);
    // Trigger meeting refresh to get updated data
    setTimeout(() => {
      setShowAnalysisSuccess(false);
    }, 3000);
  }, []);

  const handleToggleMeetingDisplay = useCallback(() => {
    if (id) {
      navigate(`/meetings/${id}/display`);
    }
  }, [id, navigate]);

  const handleTabChange = useCallback(
    (value: string) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', value);
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams]
  );

  const handleSubtabChange = useCallback(
    (value: string) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('subtab', value);
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams]
  );

  const handleStartMeeting = useCallback(async () => {
    if (!meeting || updatingStatus) {
      return;
    }

    try {
      setUpdatingStatus(true);
      await updateMeetingStatus('in_progress');
      setSuccess('会议已开始');
    } catch (error) {
      console.error('Failed to start meeting', error);
      setSuccess('开始会议失败，请稍后重试。');
    } finally {
      setUpdatingStatus(false);
    }
  }, [meeting, updateMeetingStatus, updatingStatus]);

  const handleEndMeeting = useCallback(() => {
    if (!meeting || updatingStatus) {
      return;
    }

    setConfirmDialog({
      open: true,
      title: '确认结束会议',
      description: '确认要结束当前会议吗？',
      onConfirm: async () => {
        try {
          setUpdatingStatus(true);
          await updateMeetingStatus('completed');
          setSuccess('会议已结束');
        } catch (error) {
          console.error('Failed to end meeting', error);
          setSuccess('结束会议失败，请稍后重试。');
        } finally {
          setUpdatingStatus(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }, [meeting, updateMeetingStatus, updatingStatus]);

  const handleMeetingUpdate = useCallback(
    (updatedMeeting: any) => {
      // Update local state immediately for responsive UI
      if (refresh) {
        refresh();
      }
      setSuccess('转录内容已更新');
    },
    [refresh]
  );

  const handleQuickStatusChange = useCallback(
    (newStatus: string) => {
      if (!meeting || updatingStatus) {
        return;
      }

      const performStatusChange = async () => {
        try {
          setUpdatingStatus(true);
          await updateMeetingStatus(newStatus as any);
          const statusText = getStatusText(newStatus);
          setSuccess(`会议状态已更新为: ${statusText}`);
        } catch (error) {
          console.error('Failed to update meeting status', error);
          setSuccess('更新会议状态失败，请稍后重试。');
        } finally {
          setUpdatingStatus(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      };

      // Confirm certain status changes
      if (newStatus === 'in_progress' && meeting.status !== 'in_progress') {
        setConfirmDialog({
          open: true,
          title: '确认开始会议',
          description: '确定要开始这个会议吗？',
          onConfirm: performStatusChange,
        });
        return;
      }

      if (newStatus === 'completed' && meeting.status !== 'completed') {
        setConfirmDialog({
          open: true,
          title: '确认完成会议',
          description: '确定要将会议标记为已完成吗？',
          onConfirm: performStatusChange,
        });
        return;
      }

      if (newStatus === 'cancelled' && meeting.status !== 'cancelled') {
        setConfirmDialog({
          open: true,
          title: '确认取消会议',
          description: '确定要将会议标记为已取消吗？',
          onConfirm: performStatusChange,
        });
        return;
      }

      // For other status changes, no confirmation needed
      performStatusChange();
    },
    [meeting, updateMeetingStatus, updatingStatus]
  );

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
      case 'scheduled':
        return 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/80';
      case 'in_progress':
        return 'bg-success/10 dark:bg-success/20 text-success dark:text-success/80';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-destructive/80';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'scheduled':
        return '已排期';
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return status || '未知';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'scheduled':
        return CalendarIcon;
      case 'in_progress':
        return PlayIcon;
      case 'completed':
        return PauseIcon;
      default:
        return ClockIcon;
    }
  };

  const getAvailableStatusOptions = (currentStatus?: string) => {
    const allStatuses = [
      { value: 'scheduled', label: '已排期', icon: CalendarIcon },
      { value: 'in_progress', label: '进行中', icon: PlayIcon },
      { value: 'completed', label: '已完成', icon: PauseIcon },
      { value: 'cancelled', label: '已取消', icon: AlertCircleIcon },
    ];

    return allStatuses.filter((status) => status.value !== currentStatus);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/20 via-background/20 to-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/20 via-background/20 to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error || '会议不存在'}</AlertDescription>
          </Alert>
          <BackButton url="/meetings" className="mt-4">
            返回会议列表
          </BackButton>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(meeting.status);
  const recordingsToShow =
    showConcatenatedRecording && meeting.concatenatedRecording
      ? [meeting.concatenatedRecording]
      : (meeting.recordings || []).filter((recording) => recording.source !== 'concatenated');
  const scheduledStartDate = meeting.scheduledStart ? new Date(meeting.scheduledStart) : null;
  const canStartMeeting =
    meeting.status === 'scheduled' &&
    scheduledStartDate !== null &&
    !Number.isNaN(scheduledStartDate.getTime()) &&
    isSameDay(scheduledStartDate, new Date());

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <BackButton url="/meetings" variant="ghost" className="mb-4">
          返回
        </BackButton>

        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground dark:text-foreground">{meeting.title}</h1>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-7 px-3 ${getStatusColor(meeting.status)} hover:opacity-80 transition-opacity`}
                    disabled={updatingStatus}
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {getStatusText(meeting.status)}
                    <ChevronDownIcon className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {getAvailableStatusOptions(meeting.status).map((option) => {
                    const Icon = option.icon;
                    return (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleQuickStatusChange(option.value)}
                        disabled={updatingStatus}
                        className="flex items-center gap-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-muted-foreground dark:text-muted-foreground mb-3">{meeting.summary || '暂无概要'}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {formatDate(meeting.scheduledStart)}
              </span>
              {meeting.agenda && meeting.agenda.length > 0 && (
                <span className="flex items-center gap-1">
                  <ListIcon className="w-4 h-4" />
                  {meeting.agenda.length} 项议程
                </span>
              )}
              <span className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                最近更新: {formatDate(meeting.updatedAt)}
              </span>
            </div>
            <div className="mt-4">
              <MeetingMemberAvatars
                ownerUser={ownerUser}
                memberUsers={memberUsers}
                loading={membersLoading}
                maxVisible={4}
                onOpenMemberEditor={() => navigate(`/meetings/${meeting._id}/edit?tab=members`)}
              />
            </div>
          </div>

          {!isViewerOnly && (
            <div className="flex gap-2">
              {canEdit && (
                <Button onClick={() => setShowShareDialog(true)} variant="outline">
                  <ShareIcon className="w-4 h-4 mr-2" />
                  分享
                </Button>
              )}
              {canStartMeeting && (
                <Button onClick={handleStartMeeting} disabled={updatingStatus} variant="secondary">
                  <PlayIcon className="w-4 h-4 mr-2" />
                  开始会议
                </Button>
              )}
              {meeting.status === 'in_progress' && (
                <>
                  <Button onClick={handleToggleMeetingDisplay} variant="fancy">
                    <MaximizeIcon className="w-4 h-4 mr-2" />
                    会议大屏
                  </Button>
                  <Button
                    onClick={handleEndMeeting}
                    disabled={updatingStatus}
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                  >
                    <SquareIcon className="w-4 h-4 mr-2" />
                    结束会议
                  </Button>
                </>
              )}
              {canEdit && (
                <Button onClick={() => navigate(`/meetings/${meeting._id}/edit`)} variant="outline">
                  <EditIcon className="w-4 h-4 mr-2" />
                  编辑
                </Button>
              )}
              {canEdit && meeting.status !== 'in_progress' && (
                <Button
                  onClick={handleDeleteMeeting}
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  删除
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6 w-full">
        {isViewerOnly ? (
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <FileTextIcon className="w-4 h-4" />
              记录
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <RadarIcon className="w-4 h-4" />
              AI 分析
            </TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className={`grid w-full ${showNotesTab ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="recordings" className="flex items-center gap-2">
              <HeadphonesIcon className="w-4 h-4" />
              录音
            </TabsTrigger>
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <FileTextIcon className="w-4 h-4" />
              记录
            </TabsTrigger>
            {showNotesTab && (
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileEditIcon className="w-4 h-4" />
                速记
              </TabsTrigger>
            )}
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <RadarIcon className="w-4 h-4" />
              AI 分析
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="transcript">
          <MeetingTranscript meeting={meeting} onMeetingUpdate={handleMeetingUpdate} isViewerOnly={isViewerOnly} />
        </TabsContent>

        {!isViewerOnly && (
          <TabsContent value="recordings">
            <MeetingRecordings
              meeting={meeting}
              onViewTranscript={() => {
                setShowConcatenatedRecording(true);
                setShowTranscript(true);
              }}
              onMeetingRefresh={refresh}
            />
          </TabsContent>
        )}

        {!isViewerOnly && showNotesTab && (
          <TabsContent value="notes">
            <MeetingNotes meeting={meeting} onRefresh={refresh} />
          </TabsContent>
        )}

        <TabsContent value="analysis">
          <MeetingAnaylysis meeting={meeting} isViewerOnly={isViewerOnly}>
            {({ disputedIssues, todos }) => (
              <Tabs value={activeSubtab} onValueChange={handleSubtabChange}>
                <TabsList>
                  <TabsTrigger value="disputedIssues">争论焦点</TabsTrigger>
                  <TabsTrigger value="todos">待办事项</TabsTrigger>
                </TabsList>
                <TabsContent value="disputedIssues">
                  <DisputedIssues disputedIssues={disputedIssues} />
                </TabsContent>
                <TabsContent value="todos">
                  <MeetingTodos todos={todos} />
                </TabsContent>
              </Tabs>
            )}
          </MeetingAnaylysis>
        </TabsContent>
      </Tabs>

      {/* <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">AI生成的内容不保证准确性。请在生成PPT之前仔细审查和编辑内容。</p> */}

      {/* Transcript Dialog */}
      <TranscriptDialog
        open={showTranscript}
        onOpenChange={(open) => {
          setShowTranscript(open);
          if (!open) {
            setShowConcatenatedRecording(false);
          }
        }}
        title={meeting.title}
        recordings={recordingsToShow}
        showConcatenatedRecording={showConcatenatedRecording}
        concatenatedRecording={meeting.concatenatedRecording ?? undefined}
      />

      {/* Success Message */}
      {success && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="bg-success/10 dark:bg-success/20 border-success/30 dark:border-success/70 text-success dark:text-success/80">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Analysis Success Message */}
      {showAnalysisSuccess && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="bg-primary/10 dark:bg-primary/20 border-primary/30 dark:border-primary/70 text-primary dark:text-primary/80">
            <BrainIcon className="h-4 w-4" />
            <AlertDescription>AI 分析完成！任务和争议问题已提取并保存。</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog((prev) => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Meeting Dialog */}
      <ShareMeetingDialog open={showShareDialog} onOpenChange={setShowShareDialog} meeting={meeting} onViewerAdded={refresh} />
    </div>
  );
}

export default MeetingDetail;
