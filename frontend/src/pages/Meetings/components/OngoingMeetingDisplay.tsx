import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Wifi,
  WifiOff,
  Users,
  Calendar,
  X,
  Maximize2,
  Minimize2,
  Activity,
  MessageSquare} from 'lucide-react';
import { formatDate } from '@/utils/date';
import type { MeetingWithRecordings } from '@/types';
import { useOngoingMeetingRecording } from './hooks/useOngoingMeetingRecording';
import { MeetingAgenda } from './MeetingAgenda';
import { RecordingControls } from './RecordingControls';
import { MeetingStats } from './MeetingStats';
import '@/styles/meeting-display.css';
import LiveTranscript from './LiveTranscript';

interface OngoingMeetingDisplayProps {
  meeting: MeetingWithRecordings;
  onClose: () => void;
  onRecordingComplete?: (recordingInfo: { filename: string; duration: number }) => void;
}

function OngoingMeetingDisplay({ meeting, onClose, onRecordingComplete }: OngoingMeetingDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isConnected,
    recordingTime,
    status,
    message,
    isTranscriptionConnected,
    transcriptSegments,
    partialSegment,
    transcriptionStats,
    startRecording,
    stopRecording,
    connectWebSocket
  } = useOngoingMeetingRecording(onRecordingComplete);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Enter fullscreen mode on mount
    if (containerRef.current && isFullscreen) {
      containerRef.current.requestFullscreen?.().catch(console.error);
    }
    
    return () => {
      // Exit fullscreen on unmount
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(console.error);
      }
    };
  }, [isFullscreen]);

  return (
    <div 
      ref={containerRef}
      className={`fixed overflow-y-auto inset-0 z-50 bg-gradient-to-br from-slate-900 via-primary-900/90 to-slate-900 ${
        isFullscreen ? '' : 'p-4'
      }`}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main Content */}
      <div className="relative h-full flex flex-col p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
              <Card className="relative bg-black/40 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      isRecording 
                        ? 'bg-red-500 animate-pulse' 
                        : 'bg-gradient-to-br from-purple-500 to-blue-500'
                    }`}>
                      {isRecording ? (
                        <Activity className="w-8 h-8 text-white animate-pulse" />
                      ) : (
                        <Mic className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-white mb-1">{meeting.title}</h1>
                      <div className="flex items-center gap-4 text-white/70">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(meeting.scheduledStart)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {meeting.participants || 0} Participants
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recording Timer */}
            {isRecording && (
              <div className="bg-red-500/20 backdrop-blur-xl rounded-2xl px-6 py-4 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 text-sm font-medium">RECORDING</span>
                  <span className="text-white text-2xl font-mono font-bold">{formatTime(recordingTime)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`px-3 py-1 ${
                  isConnected 
                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 mr-1" />
                    Recording Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 mr-1" />
                    Recording Disconnected
                  </>
                )}
              </Badge>
              <Badge 
                variant="outline" 
                className={`px-3 py-1 ${
                  isTranscriptionConnected 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                }`}
              >
                {isTranscriptionConnected ? (
                  <>
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Transcription Active
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Transcription Offline
                  </>
                )}
              </Badge>
            </div>

            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          {/* Left Panel - Agenda */}
          <div className="col-span-3 flex flex-col">
            <MeetingAgenda 
              agenda={meeting.agenda}
              recordingTime={recordingTime}
            />
          </div>

          {/* Center Panel - Live Transcript */}
          <div className="col-span-6 flex flex-col">
            <LiveTranscript
              transcriptSegments={transcriptSegments}
              partialSegment={partialSegment}
              isRecording={isRecording}
            />
          </div>

          {/* Right Panel - Controls and Stats */}
          <div className="col-span-3 flex flex-col gap-6">
            <RecordingControls
              isRecording={isRecording}
              isConnected={isConnected}
              status={status}
              message={message}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onConnect={connectWebSocket}
            />
            
            <MeetingStats
              transcriptionStats={transcriptionStats}
              recordingTime={recordingTime}
              participantCount={meeting.participants || 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OngoingMeetingDisplay;
