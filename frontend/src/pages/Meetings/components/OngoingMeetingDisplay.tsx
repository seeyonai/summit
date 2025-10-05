import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Maximize2, Minimize2, MessageSquare, CheckCircle2, Circle, Volume2, Sparkles, Mic, MicOff, RadioIcon } from 'lucide-react';
import { formatDate } from '@/utils/date';
import type { MeetingWithRecordings, AgendaItem } from '@/types';
import { useOngoingMeetingTranscription } from './hooks/useOngoingMeetingTranscription';

interface OngoingMeetingDisplayProps {
  meeting: MeetingWithRecordings;
  onClose: () => void;
}

interface TranscriptionSegment {
  text: string;
  startTime: number | null;
  endTime?: number;
  isPartial: boolean;
  speaker?: string;
}

function OngoingMeetingDisplay({ meeting, onClose }: OngoingMeetingDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTranscriptionEnabled, setIsTranscriptionEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    isTranscriptionConnected,
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

  const toggleTranscription = () => {
    setIsTranscriptionEnabled(prev => !prev);
    if (isTranscriptionEnabled && isListening) {
      stopListening();
    }
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

  const getAgendaStatus = (item: AgendaItem, index: number) => {
    return index === 0 ? 'active' : 'pending';
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

      {/* Fixed Control Buttons - Top Right */}
      <TooltipProvider>
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={`px-3 py-1.5 ${
              isTranscriptionConnected && isTranscriptionEnabled
                ? 'text-primary dark:text-primary/90 bg-transparent hover:bg-transparent hover:text-primary dark:hover:text-primary/90'
                : 'bg-muted/20 text-muted-foreground dark:text-muted-foreground/80 hover:bg-destructive/20 hover:text-destructive dark:hover:text-destructive/90'
            }`}
          >
            <RadioIcon className="w-3 h-3 mr-1.5" />
            {isTranscriptionConnected && isTranscriptionEnabled ? 'Transcription Active' : 'Transcription Offline'}
          </Badge>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={isListening ? stopListening : startListening}
                variant="ghost"
                size="icon"
                disabled={!isTranscriptionEnabled}
                className={`h-9 w-9 ${isListening ? 'text-destructive dark:text-destructive/90 hover:text-destructive dark:hover:text-destructive/90 hover:bg-destructive/10' : 'text-primary dark:text-foreground hover:bg-primary/10 hover:text-primary dark:hover:text-foreground'}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isListening ? 'Stop Recording' : 'Start Recording'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleTranscription}
                variant="ghost"
                size="icon"
                className={`h-9 w-9 ${isTranscriptionEnabled ? 'text-primary dark:text-foreground hover:text-primary dark:hover:text-foreground hover:bg-primary/10' : 'text-muted-foreground dark:text-muted-foreground/70 hover:bg-foreground/10'}`}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isTranscriptionEnabled ? 'Disable Transcription' : 'Enable Transcription'}</p>
            </TooltipContent>
          </Tooltip>

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
              <p>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</p>
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
              <p>Close Display</p>
            </TooltipContent>
          </Tooltip>
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
          {meeting.agenda && meeting.agenda.length > 0 && (
            <div className="bg-transparent">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Meeting Agenda
                </h2>
                <div className="space-y-3">
                  {meeting.agenda.map((item, index) => {
                    const status = getAgendaStatus(item, index);
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border transition-all duration-300 ${
                          status === 'active'
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-muted/30 border-border/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {status === 'active' ? (
                              <div className="relative">
                                <Circle className="w-5 h-5 text-primary" />
                                <div className="absolute inset-0 w-5 h-5 bg-primary rounded-full animate-ping opacity-75" />
                              </div>
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium ${
                              status === 'active' ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {item.text}
                            </h3>
                            <div className="flex items-center gap-3 text-xs mt-1.5">
                              <span className={`px-2 py-0.5 rounded-full ${
                                item.status === 'resolved' 
                                  ? 'bg-success/20 text-success'
                                  : item.status === 'ongoing'
                                  ? 'bg-warning/20 text-warning'
                                  : 'bg-muted/20 text-muted-foreground'
                              }`}>
                                {item.status}
                              </span>
                              <span className="text-muted-foreground">Item {item.order}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Live Transcription - Max 3 Rows */}
          {isTranscriptionEnabled && (
            <div className="bg-transparent">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  {isListening && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-destructive/20 rounded-full">
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      <span className="text-destructive text-xs font-medium">LIVE</span>
                    </div>
                  )}
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
                          ? 'Listening for speech...' 
                          : 'Start recording to see live transcription'}
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
                                {partialSegment.speaker || 'Speaker'}
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
                                {segment.speaker || `Segment ${segmentNumber}`}
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
                      Showing latest 3 of {transcriptSegments.length} segments
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OngoingMeetingDisplay;
