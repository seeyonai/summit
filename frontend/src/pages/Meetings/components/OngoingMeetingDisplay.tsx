import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Maximize2, Minimize2, MessageSquare, Volume2, Sparkles, Mic, MicOff, RadioIcon, ListTodo, ChevronDown, ChevronUp, Radio, WifiOff } from 'lucide-react';
import type { MeetingWithRecordings, AgendaItem } from '@/types';
import { useOngoingMeetingTranscription } from './hooks/useOngoingMeetingTranscription';
import { useAgendaOwners, useAgendaStatus } from '@/hooks/useAgenda';
import { useRecordingPanel } from '@/contexts/RecordingPanelContext';
import { api } from '@/services/api';
import MeetingAgendaItem from './MeetingAgendaItem';
import AgendaStatusMenu from '@/components/meetings/AgendaStatusMenu';

interface OngoingMeetingDisplayProps {
  meeting: MeetingWithRecordings;
  onClose: () => void;
}

const cloneAgenda = (agenda: AgendaItem[]): AgendaItem[] => agenda.map(item => ({ ...item }));

function OngoingMeetingDisplay({ meeting, onClose }: OngoingMeetingDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAgendaVisible, setIsAgendaVisible] = useState(true);
  const [isTranscriptMinimized, setIsTranscriptMinimized] = useState(false);
  const [currentAgenda, setCurrentAgenda] = useState(meeting.agenda || []);
  const [updatingAgenda, setUpdatingAgenda] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Use shared hooks
  const { ownerCache } = useAgendaOwners(currentAgenda);
  const { getAgendaStatus } = useAgendaStatus();
  const { toggleFloatingPanel, showFloatingPanel } = useRecordingPanel();

  const {
    isListening,
    isTranscriptionConnected,
    transcriptionStatus,
    transcriptSegments,
    partialSegment,
    startListening,
    stopListening
  } = useOngoingMeetingTranscription();

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const toggleTranscriptMinimize = () => {
    setIsTranscriptMinimized(prev => !prev);
  };

  const toggleAgenda = () => {
    setIsAgendaVisible(prev => !prev);
  };

  const updateAgendaStatus = async (itemIndex: number, newStatus: AgendaItem['status']) => {
    if (updatingAgenda) return;

    const previousAgenda = cloneAgenda(currentAgenda);

    try {
      setUpdatingAgenda(true);

      const updatedAgenda = [...currentAgenda];
      updatedAgenda[itemIndex] = {
        ...updatedAgenda[itemIndex],
        status: newStatus
      };

      setCurrentAgenda(updatedAgenda);

      // Update on backend using existing meeting update endpoint
      await api(`/api/meetings/${meeting._id}`, {
        method: 'PUT',
        body: JSON.stringify({ agenda: updatedAgenda })
      });
    } catch (error) {
      console.error('Failed to update agenda status:', error);
      // Revert changes on error
      setCurrentAgenda(previousAgenda);
    } finally {
      setUpdatingAgenda(false);
    }
  };

  const handleAgendaClick = async (clickedItem: AgendaItem) => {
    const clickedIndex = currentAgenda.findIndex(a => a.order === clickedItem.order);
    if (clickedIndex === -1) return;

    const updatedAgenda = [...currentAgenda];
    let needsUpdate = false;
    const previousAgenda = cloneAgenda(currentAgenda);

    // Find current active item (in_progress)
    const currentActiveIndex = updatedAgenda.findIndex(item => item.status === 'in_progress');

    // If clicked item is not already the active one
    if (clickedIndex !== currentActiveIndex) {
      // Mark current active item as completed
      if (currentActiveIndex !== -1) {
        updatedAgenda[currentActiveIndex] = {
          ...updatedAgenda[currentActiveIndex],
          status: 'completed'
        };
        needsUpdate = true;
      }

      // Set clicked item to in_progress
      updatedAgenda[clickedIndex] = {
        ...updatedAgenda[clickedIndex],
        status: 'in_progress'
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      setCurrentAgenda(updatedAgenda);

      // Update on backend
      try {
        await api(`/api/meetings/${meeting._id}`, {
          method: 'PUT',
          body: JSON.stringify({ agenda: updatedAgenda })
        });
      } catch (error) {
        console.error('Failed to update agenda status:', error);
        // Revert changes on error
        setCurrentAgenda(previousAgenda);
      }
    }
  };

  const handleStatusMenuChange = async (item: AgendaItem, newStatus: AgendaItem['status']) => {
    const itemIndex = currentAgenda.findIndex(a => a.order === item.order);
    if (itemIndex === -1) return;

    await updateAgendaStatus(itemIndex, newStatus);
  };

  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-scroll transcript to show latest entries
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcriptSegments, partialSegment]);

  const formatSegmentTimestamp = (value?: number | null): string => {
    if (!value) return '--:--:--';
    return new Date(value).toLocaleTimeString();
  };

  const getSpeakerColor = (speaker?: string) => {
    const colors = [
      'bg-accent/10 border-accent/30',
      'bg-success/10 border-success/30',
      'bg-warning/10 border-warning/30',
      'bg-primary/10 border-primary/30',
    ];
    
    if (!speaker) return colors[0];
    
    const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  
  // Show only the latest 3 transcript segments
  const visibleSegments = transcriptSegments.slice(0, 3);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-40 overflow-hidden bg-gradient-to-br from-background via-muted/20 to-background dark:from-background dark:via-primary/5 dark:to-background"
    >
      {/* Static Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/30 dark:bg-primary/40 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-accent/30 dark:bg-accent/40 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 dark:bg-primary/30 rounded-full blur-[120px]" />
      </div>

      {/* Fixed Control Buttons - Top Toolbar */}
      <TooltipProvider>
        <div className="fixed top-6 left-6 right-6 z-50 flex items-center justify-between">
          {/* Left Side Buttons */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleFloatingPanel}
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 ${
                    showFloatingPanel 
                      ? 'bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showFloatingPanel ? '隐藏录音面板' : '显示录音面板'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={isListening ? stopListening : startListening}
                  variant="ghost"
                  size="icon"
                  disabled={!isTranscriptionConnected && !isListening}
                  className={`h-9 w-9 ${
                    isListening 
                      ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive' 
                      : isTranscriptionConnected
                        ? 'bg-muted/50 text-muted-foreground hover:bg-primary/20 hover:text-primary'
                        : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                  }`}
                >
                  <Radio className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
                  {isListening && (
                    isTranscriptionConnected ? (
                      <RadioIcon className="w-2 h-2 absolute top-1 right-1 text-green-500 animate-pulse" />
                    ) : (
                      <WifiOff className="w-2 h-2 absolute top-1 right-1 text-red-500 animate-pulse" />
                    )
                  )}
                  {!isListening && !isTranscriptionConnected && (
                    <WifiOff className="w-2 h-2 absolute top-1 right-1 text-muted-foreground/50" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {!isTranscriptionConnected && !isListening 
                    ? '实时语音识别未连接' 
                    : isListening 
                      ? '停止实时语音识别' 
                      : '开始实时语音识别'}
                  {isListening && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      {isTranscriptionConnected 
                        ? '已连接' 
                        : transcriptionStatus === 'connecting' 
                          ? '连接中...' 
                          : '未连接'}
                    </span>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleAgenda}
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 ${
                    isAgendaVisible 
                      ? 'bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <ListTodo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isAgendaVisible ? '隐藏议程' : '显示议程'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right Side Buttons */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleFullscreen}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-primary dark:text-foreground hover:bg-primary/10 hover:text-primary dark:hover:text-foreground"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? '退出全屏' : '进入全屏'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-primary dark:text-foreground hover:bg-primary/10 hover:text-primary dark:hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>关闭显示</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Main Content - Single Column Centered */}
      <div className="relative h-full flex items-center justify-center p-8 pt-24 overflow-y-auto">
        <div className="w-full max-w-4xl space-y-6">
          
          {/* Meeting Title */}
          <div className="bg-transparent">
            <div className="p-8">
              <h1 className="text-4xl font-bold text-center">{meeting.title}</h1>
            </div>
          </div>

          {/* Agenda Section */}
          {isAgendaVisible && currentAgenda && currentAgenda.length > 0 && (
            <div className="bg-transparent group">
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <h2 className="w-full text-center text-xl text-muted-foreground font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    议程
                  </h2>
                  {updatingAgenda && (
                    <div className="text-xs text-muted-foreground animate-pulse">
                      更新中...
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {currentAgenda.map((item, index) => (
                    <MeetingAgendaItem
                      key={index}
                      item={item}
                      status={getAgendaStatus(item, index, meeting.status)}
                      ownerCache={ownerCache}
                      onClick={handleAgendaClick}
                      secondaryAction={
                        <AgendaStatusMenu
                          currentStatus={item.status}
                          onStatusChange={(newStatus) => handleStatusMenuChange(item, newStatus)}
                          disabled={updatingAgenda}
                        />
                      }
                    />
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground text-center opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                  单击任何议程项目使其成为当前项目（前一个项目将标记为完成），或使用菜单更改状态
                </div>
              </div>
            </div>
          )}

          {/* Live Transcription - Max 3 Rows */}
          {isListening && !isTranscriptMinimized && (
            <div className="bg-transparent group rounded-2xl border border-dashed border-primary/30 hover:border-border transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {isListening && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-destructive/20 rounded-full">
                        <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                        <span className="text-destructive text-xs font-medium">LIVE</span>
                      </div>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={toggleTranscriptMinimize}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <ChevronDown className="w-4 h-4 mr-1" />
                          <span className="text-xs">最小化</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>最小化转录面板</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div 
                  ref={transcriptContainerRef}
                  className="space-y-3 max-h-[300px] overflow-y-auto scroll-smooth"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'hsl(var(--primary) / 0.3) transparent'
                  }}
                >
                  {/* Empty State */}
                  {visibleSegments.length === 0 && !partialSegment && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="w-12 h-12 text-muted-foreground/20 mb-3" />
                      <p className="text-muted-foreground text-sm">
                        {isListening 
                          ? '正在监听语音...' 
                          : '请讲话'}
                      </p>
                    </div>
                  )}

                  {/* Partial Segment */}
                  {partialSegment && (
                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Volume2 className="w-5 h-5 text-warning animate-pulse mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-warning">
                                {partialSegment.speaker || '说话人'}
                              </span>
                              <Sparkles className="w-3 h-3 text-warning animate-pulse" />
                            </div>
                            <span className="text-xs text-warning/70">
                              {formatSegmentTimestamp(partialSegment.startTime)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">
                            {partialSegment.text}
                            <span className="inline-block w-1.5 h-4 ml-1 bg-warning/50 animate-pulse" />
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Completed Segments (Latest 3) */}
                  {visibleSegments.map((segment, index) => {
                    const segmentNumber = visibleSegments.length - index;
                    const key = `${segment.startTime ?? 'segment'}-${index}`;
                    const colorClass = getSpeakerColor(segment.speaker);

                    return (
                      <div 
                        key={key}
                        className={`${colorClass} border rounded-lg p-4 transition-all duration-300`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-medium text-primary">
                              {segment.speaker ? segment.speaker.slice(-1) : segmentNumber}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                {segment.speaker || `片段 ${segmentNumber}`}
                              </span>
                              <span className="text-xs text-muted-foreground/70">
                                {formatSegmentTimestamp(segment.startTime)}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">
                              {segment.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {transcriptSegments.length > 3 && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      显示最新 3 条，共 {transcriptSegments.length} 条片段
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Floating Minimized Transcript Button */}
          {isListening && isTranscriptMinimized && (
            <div className="fixed bottom-8 right-8 z-50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={toggleTranscriptMinimize}
                      size="lg"
                      className="h-16 px-6 bg-primary/90 hover:bg-primary shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-primary/20 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <MessageSquare className="w-6 h-6" />
                          {isListening && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
                          )}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-semibold">实时转录</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs opacity-90">
                              {transcriptSegments.length} 条片段
                            </span>
                            {transcriptSegments.length > 0 && (
                              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-primary-foreground/20 rounded-full animate-pulse">
                                {transcriptSegments.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronUp className="w-5 h-5 ml-2 group-hover:translate-y-[-2px] transition-transform" />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>展开转录面板</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OngoingMeetingDisplay;
