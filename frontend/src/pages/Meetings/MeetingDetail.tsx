import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeetingDetail } from "@/hooks/useMeetingDetail";
import { useTodoAdvice } from "@/hooks/useTodoAdvice";
import { formatDate } from "@/utils/date";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useRecordingPanel } from "@/contexts/RecordingPanelContext";
import MeetingTranscript from "./components/MeetingTranscript";
import MeetingRecordings from "./components/MeetingRecordings";
import DisputedIssues from "./components/DisputedIssues";
import TranscriptDialog from "@/components/meetings/TranscriptDialog";
import AdviceDialog from "@/components/meetings/AdviceDialog";
import {
  ArrowLeftIcon,
  EditIcon,
  TrashIcon,
  MoreVerticalIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  AlertCircleIcon,
  MicIcon,
  PlayIcon,
  PauseIcon,
  BrainIcon,
  MaximizeIcon,
  TargetIcon,
  FileTextIcon,
  HeadphonesIcon,
} from "lucide-react";

// Lazy load heavy components
const RealTimeSpeechRecognition = lazy(() =>
  import("@/components/Audio").then((m) => ({
    default: m.RealTimeSpeechRecognition,
  }))
);

const OngoingMeetingDisplay = lazy(
  () => import("./components/OngoingMeetingDisplay")
);

function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [success, setSuccess] = useState<string | null>(null);
  const [showAnalysisSuccess, setShowAnalysisSuccess] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const showMeetingDisplay = searchParams.get("display") === "full";
  const activeTab = searchParams.get("tab") || "recordings";

  const {
    isRecording,
    partialText,
    finalText,
    recordingTime,
    isConnected,
    startRecording: startMicRecording,
    stopRecording: stopMicRecording,
  } = useAudioRecording();

  const { toggleFloatingPanel, closePanel, exitFullscreen, enterFullscreen } =
    useRecordingPanel();

  // Use custom hooks
  const {
    meeting,
    loading,
    error,
    showTranscript,
    showCombinedRecording,
    setShowTranscript,
    setShowCombinedRecording,
    deleteMeeting,
    handleRecordingComplete,
  } = useMeetingDetail(id);

  const {
    adviceById,
    loadingById,
    selectedTodoId,
    generateAdvice,
    setSelectedTodoId,
  } = useTodoAdvice();

  // Event handlers
  const handleGenerateAdvice = useCallback(
    (todo: any) => {
      if (!id || !todo.id) return;
      generateAdvice(id, todo.id, todo.text);
    },
    [id, generateAdvice]
  );

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
    (recordingInfo: any) => {
      // Handle recording completion
      handleRecordingComplete(recordingInfo);
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
          <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      case "in_progress":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "completed":
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
      case "failed":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50/20 via-white/20 to-gray-50/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/20 via-white/20 to-gray-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error || "会议不存在"}</AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate("/meetings")}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回会议列表
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(meeting.status);
  const canRecord = meeting.status === "in_progress";
  const recordingsToShow =
    showCombinedRecording && meeting.combinedRecording
      ? [meeting.combinedRecording]
      : meeting.recordings || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Button
          onClick={() => navigate("/meetings")}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 -ml-2 mr-2" />
          返回
        </Button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
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
            <p className="text-gray-600 dark:text-gray-400">{meeting.summary || "暂无概要"}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
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
                className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border-purple-500/30"
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
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
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
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Analysis Success Message */}
      {showAnalysisSuccess && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400">
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
