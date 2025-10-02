import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMeetingDetail } from "@/hooks/useMeetingDetail";
import { useTodoAdvice } from "@/hooks/useTodoAdvice";
import { formatDate } from "@/utils/date";
import { useRecordingPanel } from "@/contexts/RecordingPanelContext";
import BackButton from "@/components/BackButton";
import MeetingTranscript from "./components/MeetingTranscript";
import MeetingRecordings from "./components/MeetingRecordings";
import DisputedIssues from "./components/DisputedIssues";
import TranscriptDialog from "@/components/meetings/TranscriptDialog";
import AdviceDialog from "@/components/meetings/AdviceDialog";
import MeetingMembers from "@/components/MeetingMembers";
import {
  ArrowLeftIcon,
  EditIcon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  AlertCircleIcon,
  PlayIcon,
  PauseIcon,
  BrainIcon,
  MaximizeIcon,
  TargetIcon,
  FileTextIcon,
  HeadphonesIcon,
} from "lucide-react";
import OngoingMeetingDisplay from "./components/OngoingMeetingDisplay";
import type { RecordingInfo } from './components/hooks/useOngoingMeetingRecording';

function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [success, setSuccess] = useState<string | null>(null);
  const [showAnalysisSuccess, setShowAnalysisSuccess] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  console.log("searchParams:", searchParams.getAll('tab'));
  const showMeetingDisplay = searchParams.get("display") === "full";
  const activeTab = searchParams.get("tab") || "recordings";
  console.log("activeTab:", activeTab);

  const { exitFullscreen, enterFullscreen } =
    useRecordingPanel();

  // Use custom hooks
  const {
    meeting,
    loading,
    error,
    showTranscript,
    showCombinedRecording,
    setShowTranscript,
    deleteMeeting,
    handleRecordingComplete,
    refresh,
  } = useMeetingDetail(id);

  const {
    adviceById,
    loadingById,
    selectedTodoId,
    generateAdvice,
    setSelectedTodoId,
  } = useTodoAdvice();

  // Event handlers

  const handleDeleteMeeting = async () => {
    if (!confirm("确定要删除这个会议吗？此操作不可撤销。")) {
      return;
    }
    await deleteMeeting();
    navigate("/meetings");
  };

  const handleAnalysisComplete = useCallback(() => {
    setShowAnalysisSuccess(true);
    // Trigger meeting refresh to get updated data
    setTimeout(() => {
      setShowAnalysisSuccess(false);
    }, 3000);
  }, []);

  const handleToggleMeetingDisplay = useCallback(() => {
    const nextVisible = !showMeetingDisplay;
    const nextParams = new URLSearchParams(searchParams);
    if (nextVisible) {
      nextParams.set("display", "full");
    } else {
      nextParams.delete("display");
    }
    setSearchParams(nextParams);
  }, [showMeetingDisplay, searchParams, setSearchParams]);

  const handleExitMeetingDisplay = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("display");
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  const handleTabChange = useCallback((value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", value);
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  const handleMeetingRecordingComplete = useCallback(
    (recordingInfo: RecordingInfo) => {
      if (typeof recordingInfo.duration !== 'number') {
        return;
      }
      handleRecordingComplete({
        duration: recordingInfo.duration,
        downloadUrl: recordingInfo.downloadUrl,
      });
      setSuccess("Recording saved successfully!");
    },
    [handleRecordingComplete]
  );

  useEffect(() => {
    if (showMeetingDisplay) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  }, [showMeetingDisplay, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Render full-screen meeting display if active
  if (showMeetingDisplay && meeting && meeting.status === "in_progress") {
    return (
      <Suspense
        fallback={
          <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-primary/20 to-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }
      >
        <OngoingMeetingDisplay
          meeting={meeting}
          onClose={handleExitMeetingDisplay}
          onRecordingComplete={handleMeetingRecordingComplete}
        />
      </Suspense>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "scheduled":
        return "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/80";
      case "in_progress":
        return "bg-success/10 dark:bg-success/20 text-success dark:text-success/80";
      case "completed":
        return "bg-muted text-muted-foreground";
      case "failed":
        return "bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-destructive/80";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "scheduled":
        return "已排期";
      case "in_progress":
        return "进行中";
      case "completed":
        return "已完成";
      case "failed":
        return "失败";
      default:
        return status || "未知";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "scheduled":
        return CalendarIcon;
      case "in_progress":
        return PlayIcon;
      case "completed":
        return PauseIcon;
      default:
        return ClockIcon;
    }
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
            <AlertDescription>{error || "会议不存在"}</AlertDescription>
          </Alert>
          <BackButton url="/meetings" className="mt-4">返回会议列表</BackButton>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(meeting.status);
  const recordingsToShow =
    showCombinedRecording && meeting.combinedRecording
      ? [meeting.combinedRecording]
      : meeting.recordings || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <BackButton url="/meetings" variant="ghost" className="mb-4">返回</BackButton>

        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground dark:text-foreground">
                {meeting.title}
              </h1>
              <Badge
                variant="outline"
                className={getStatusColor(meeting.status)}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {getStatusText(meeting.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground dark:text-muted-foreground">{meeting.summary || "暂无概要"}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground dark:text-muted-foreground">
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
            {meeting.status === "in_progress" && (
              <Button
                onClick={handleToggleMeetingDisplay}
                variant="outline"
                className="bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border-primary/30"
              >
                <MaximizeIcon className="w-4 h-4 mr-2" />
                {showMeetingDisplay ? "退出大屏" : "会议大屏"}
              </Button>
            )}
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
              className="text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              删除
            </Button>
          </div>
        </div>

      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6 w-full"
      >
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="recordings" className="flex items-center gap-2">
            <HeadphonesIcon className="w-4 h-4" />
            录音
          </TabsTrigger>
          <TabsTrigger value="transcript" className="flex items-center gap-2">
            <FileTextIcon className="w-4 h-4" />
            记录
          </TabsTrigger>
          <TabsTrigger value="disputedIssues" className="flex items-center gap-2">
            <TargetIcon className="w-4 h-4" />
            争论焦点
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4" />
            成员
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcript">
          <MeetingTranscript meeting={meeting} />
        </TabsContent>

        <TabsContent value="recordings">
          <MeetingRecordings
            meeting={meeting}
            onViewTranscript={() => setShowTranscript(true)}
          />
        </TabsContent>

        <TabsContent value="disputedIssues">
          <DisputedIssues
            meetingId={meeting._id}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </TabsContent>

        <TabsContent value="members">
          <MeetingMembers
            meetingId={meeting._id}
            ownerId={meeting.ownerId}
            members={meeting.members}
            onChanged={refresh}
          />
        </TabsContent>

      </Tabs>

      {/* Transcript Dialog */}
      <TranscriptDialog
        open={showTranscript}
        onOpenChange={setShowTranscript}
        title={meeting.title}
        recordings={recordingsToShow}
      />

      {/* Advice Dialog */}
      <AdviceDialog
        open={!!selectedTodoId}
        onOpenChange={(open) => !open && setSelectedTodoId(null)}
        todoText={
          selectedTodoId
            ? meeting.parsedTodos?.find((t) => t.id === selectedTodoId)?.text
            : undefined
        }
        advice={selectedTodoId ? adviceById[selectedTodoId] : undefined}
        loading={selectedTodoId ? loadingById[selectedTodoId] : false}
        onRegenerate={
          selectedTodoId
            ? () => {
                const todo = meeting.parsedTodos?.find(
                  (t) => t.id === selectedTodoId
                );
                if (todo && id) generateAdvice(id, selectedTodoId, todo.text);
              }
            : undefined
        }
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
            <AlertDescription>
              AI 分析完成！任务和争议问题已提取并保存。
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}

export default MeetingDetail;
