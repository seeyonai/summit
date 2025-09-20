import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MeetingHeader from './MeetingHeader';
import LeftPanel from './LeftPanel/LeftPanel';
import TranscriptArea from './TranscriptArea/TranscriptArea';
import StatusBar from './StatusBar';
import MinimalModeToggle from './MinimalModeToggle';
import AiActionsDialog from './AiActionsDialog';
import SettingsDialog from './SettingsDialog';
import { useMeetingTheme } from './useMeetingTheme';
import { Wifi, WifiOff } from 'lucide-react';

interface TranscriptionSegment {
  text: string;
  startTime: number | null;
  endTime?: number;
  isPartial: boolean;
}

interface MeetingDisplayProps {
  isVisible: boolean;
  isRecording: boolean;
  partialText: string;
  finalText: string;
  recordingTime: number;
  isConnected: boolean;
  onStopRecording: () => void;
  onExitFullscreen: () => void;
  initialTitle: string;
  initialAgenda: string;
}

const MeetingDisplay: React.FC<MeetingDisplayProps> = ({
  isVisible,
  isRecording,
  partialText,
  finalText,
  recordingTime,
  isConnected,
  onStopRecording,
  onExitFullscreen,
  initialTitle,
  initialAgenda
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showAgenda, setShowAgenda] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMinimalMode, setIsMinimalMode] = useState(false);
  
  // Transcription state
  const [isTranscriptionConnected, setIsTranscriptionConnected] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'connecting' | 'ready' | 'listening' | 'error'>('idle');
  const [transcriptionMessage, setTranscriptionMessage] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptionSegment[]>([]);
  const [partialSegment, setPartialSegment] = useState<TranscriptionSegment | null>(null);
  
  // Auto-recording state
  // Internal recording state (independent from external isRecording)
  const [internalRecording, setInternalRecording] = useState(false);
  const [internalRecordingTime, setInternalRecordingTime] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'ready' | 'recording' | 'saving' | 'completed' | 'error'>('idle');
  const [recordingMessage, setRecordingMessage] = useState('');
  const internalRecordingTimerRef = useRef<number | null>(null);
  const isInternalRecordingRef = useRef(false);
  
  const transcriptionWsRef = useRef<WebSocket | null>(null);
  const transcriptionReconnectTimerRef = useRef<number | null>(null);
  const componentUnmountedRef = useRef(false);
  const partialSegmentRef = useRef<TranscriptionSegment | null>(null);
  const lastTranscriptionTypeRef = useRef<string | null>(null);
  const autoStartTimerRef = useRef<number | null>(null);
  const hasAutoStartedRef = useRef(false);
  
  // Audio capture refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isAudioCapturingRef = useRef(false);
  
  const { isDarkMode, setIsDarkMode, themeClasses, toggleTheme } = useMeetingTheme();

  // Transcription WebSocket URL configuration
  const transcriptionApiBase = useMemo(() => {
    const fallback = (() => {
      if (typeof window === 'undefined') {
        return 'http://localhost:2592/';
      }

      const { protocol, hostname } = window.location;
      if (protocol === 'file:' || !hostname) {
        return 'http://localhost:2592/';
      }

      return `${protocol}//${hostname}:2592/`;
    })();

    const configured = (import.meta.env as Record<string, string | undefined>)?.LIVE_SERVICE_URL
      ?? (typeof window !== 'undefined' ? (window as any).ECHO_STREAM_API_BASE : undefined);

    const normalize = (value?: string | null) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      
      try {
        const url = new URL(trimmed, fallback);
        const trimmedPath = url.pathname && url.pathname !== '/' ? url.pathname.replace(/\/$/, '') : '';
        const base = trimmedPath ? `${url.origin}${trimmedPath}` : url.origin;
        return base.endsWith('/') ? base : `${base}/`;
      } catch (error) {
        return null;
      }
    };

    return normalize(configured) ?? fallback;
  }, []);

  const transcriptionWsUrl = useMemo(() => {
    try {
      const endpoint = new URL('api/ws', transcriptionApiBase);
      const protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${endpoint.host}${endpoint.pathname}${endpoint.search}`;
    } catch (error) {
      return 'ws://localhost:2592/api/ws';
    }
  }, [transcriptionApiBase]);

  // Handle transcription WebSocket messages
  const handleTranscriptionPayload = useCallback((raw: Record<string, unknown>) => {
    const type = typeof raw.type === 'string' ? raw.type : '';
    const now = Date.now();

    if (!type) return;

    if (type === 'partial') {
      const text = typeof raw.text === 'string' ? raw.text : '';
      lastTranscriptionTypeRef.current = 'partial';

      setPartialSegment(prev => {
        const base = prev ?? {
          text: '',
          startTime: now,
          isPartial: true
        };

        let updatedText = text;

        if (prev && text) {
          if (text.length > prev.text.length && text.startsWith(prev.text)) {
            updatedText = text;
          } else if (text !== prev.text) {
            updatedText = prev.text ? `${prev.text} ${text}` : text;
          }
        }

        const nextSegment: TranscriptionSegment = {
          text: updatedText,
          startTime: base.startTime ?? now,
          isPartial: true
        };

        partialSegmentRef.current = nextSegment;
        return nextSegment;
      });

      setTranscriptionStatus('listening');
      setTranscriptionMessage('Streaming live transcription...');
      return;
    }

    if (type === 'final' && raw.isFinal) {
      lastTranscriptionTypeRef.current = 'final';

      setTranscriptSegments(prev => {
        const fallback = partialSegmentRef.current?.text ?? '';
        const text = typeof raw.text === 'string' && raw.text ? raw.text : fallback;

        if (!text) return prev;

        const segment: TranscriptionSegment = {
          text,
          startTime: partialSegmentRef.current?.startTime ?? now,
          endTime: now,
          isPartial: false
        };

        return [segment, ...prev];
      });

      setPartialSegment(null);
      partialSegmentRef.current = null;
      setTranscriptionStatus('ready');
      setTranscriptionMessage('Received final transcript segment.');
      return;
    }

    if (type === 'info') {
      lastTranscriptionTypeRef.current = 'info';
      const infoMessage = typeof raw.message === 'string' ? raw.message : '';
      setTranscriptionMessage(infoMessage);

      if (infoMessage === 'ready') {
        setTranscriptionStatus('ready');
      } else if (infoMessage === 'session started') {
        setTranscriptionStatus('listening');
      } else if (infoMessage === 'session finished') {
        setTranscriptionStatus('ready');
      }
      return;
    }

    if (type === 'error') {
      lastTranscriptionTypeRef.current = 'error';
      const errorMessage = typeof raw.message === 'string' ? raw.message : 'Transcription error';
      setTranscriptionStatus('error');
      setTranscriptionMessage(errorMessage);
    }
  }, []);

  // Handle recording state changes for transcription
  useEffect(() => {
    // Only sync external recording state if internal recording is not active
    // This prevents interference with auto-recording functionality
    if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN && !internalRecording) {
      if (isRecording) {
        transcriptionWsRef.current.send(JSON.stringify({
          type: 'start',
          sample_rate: 16000
        }));
        setTranscriptionStatus('listening');
        setTranscriptionMessage('External transcription started...');
      } else {
        transcriptionWsRef.current.send(JSON.stringify({ type: 'stop' }));
        if (transcriptionStatus !== 'error') {
          setTranscriptionStatus('ready');
        }
        setTranscriptionMessage('External transcription stopped.');
      }
    }
  }, [isRecording, transcriptionStatus, internalRecording]);

  // Audio capture setup
  const setupAudioCapture = useCallback(async () => {
    if (isAudioCapturingRef.current) return;

    try {
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 16000 });
      
      // Load the PCM worklet (this should be available in your public folder)
      await audioContextRef.current.audioWorklet.addModule('/pcm-worklet.js');

      // Get microphone access
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        }
      });

      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm16-downsampler', { 
        numberOfInputs: 1, 
        numberOfOutputs: 0 
      });

      // Connect to transcription WebSocket for sending audio chunks
      workletNodeRef.current.port.onmessage = (event) => {
        if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
          transcriptionWsRef.current.send(event.data);
        }
      };

      source.connect(workletNodeRef.current);
      isAudioCapturingRef.current = true;

      console.log('Audio capture setup complete');
    } catch (error) {
      console.error('Error setting up audio capture:', error);
      setTranscriptionMessage('Failed to access microphone. Please check permissions.');
      setTranscriptionStatus('error');
    }
  }, []);

  // Stop audio capture
  const stopAudioCapture = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    isAudioCapturingRef.current = false;
    console.log('Audio capture stopped');
  }, []);

  // Handle recording state changes for audio capture
  useEffect(() => {
    if (isRecording && !isAudioCapturingRef.current) {
      setupAudioCapture();
    } else if (!isRecording && isAudioCapturingRef.current) {
      stopAudioCapture();
    }
  }, [isRecording, setupAudioCapture, stopAudioCapture]);

  const stopInternalRecording = useCallback((options?: { resetAutoStart?: boolean }) => {
    if (!isInternalRecordingRef.current) {
      if (options?.resetAutoStart) {
        hasAutoStartedRef.current = false;
      }
      return;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (internalRecordingTimerRef.current) {
      window.clearInterval(internalRecordingTimerRef.current);
      internalRecordingTimerRef.current = null;
    }

    if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
      transcriptionWsRef.current.send(JSON.stringify({ type: 'stop' }));
      if (transcriptionStatus !== 'error') {
        setTranscriptionStatus('ready');
      }
      setTranscriptionMessage('Transcription stopped.');
    }

    setInternalRecording(false);
    isInternalRecordingRef.current = false;
    setInternalRecordingTime(0);
    setRecordingStatus('completed');
    setRecordingMessage('Auto-recording completed.');

    if (options?.resetAutoStart) {
      hasAutoStartedRef.current = false;
    }

    console.log('Internal recording stopped');
  }, [transcriptionStatus]);

  const startInternalRecording = useCallback(async () => {
    if (isInternalRecordingRef.current) {
      return;
    }

    if (!isTranscriptionConnected || !transcriptionWsRef.current || transcriptionWsRef.current.readyState !== WebSocket.OPEN) {
      setRecordingMessage('Cannot start recording: Transcription service not connected');
      hasAutoStartedRef.current = false;
      return;
    }

    hasAutoStartedRef.current = true;

    try {
      transcriptionWsRef.current.send(JSON.stringify({
        type: 'start',
        sample_rate: 16000
      }));
      lastTranscriptionTypeRef.current = null;
      setTranscriptionStatus('listening');
      setTranscriptionMessage('Transcription started...');
      setTranscriptSegments([]);
      setPartialSegment(null);
      partialSegmentRef.current = null;
      setInternalRecordingTime(0);

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      await audioContextRef.current.audioWorklet.addModule('/pcm-worklet.js');

      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        }
      });

      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm16-downsampler', {
        numberOfInputs: 1,
        numberOfOutputs: 0
      });

      workletNodeRef.current.port.onmessage = (event) => {
        if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
          transcriptionWsRef.current.send(event.data);
        }
      };

      source.connect(workletNodeRef.current);

      if (internalRecordingTimerRef.current) {
        window.clearInterval(internalRecordingTimerRef.current);
      }

      internalRecordingTimerRef.current = window.setInterval(() => {
        setInternalRecordingTime(prev => prev + 1);
      }, 1000);

      setInternalRecording(true);
      isInternalRecordingRef.current = true;
      setRecordingStatus('recording');
      setRecordingMessage('Auto-recording started...');

      console.log('Internal recording started');
    } catch (error) {
      console.error('Error starting internal recording:', error);
      setRecordingStatus('error');
      setRecordingMessage('Failed to start recording. Please check microphone permissions.');
      isInternalRecordingRef.current = false;
      hasAutoStartedRef.current = false;

      if (internalRecordingTimerRef.current) {
        window.clearInterval(internalRecordingTimerRef.current);
        internalRecordingTimerRef.current = null;
      }

      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [isTranscriptionConnected]);

  // Connect to transcription WebSocket
  const connectTranscriptionWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (transcriptionReconnectTimerRef.current) {
      window.clearTimeout(transcriptionReconnectTimerRef.current);
      transcriptionReconnectTimerRef.current = null;
    }

    setTranscriptionStatus('connecting');
    setTranscriptionMessage('Connecting to transcription service...');

    const ws = new WebSocket(transcriptionWsUrl);
    transcriptionWsRef.current = ws;

    ws.onopen = () => {
      setIsTranscriptionConnected(true);
      const shouldResumeInternal = isInternalRecordingRef.current;

      if (isRecording || shouldResumeInternal) {
        ws.send(JSON.stringify({
          type: 'start',
          sample_rate: 16000
        }));
        setTranscriptionStatus('listening');
        setTranscriptionMessage(shouldResumeInternal ? 'Transcription resumed.' : 'Transcription started.');
      } else {
        setTranscriptionStatus('ready');
        setTranscriptionMessage('Transcription service connected. Start recording to stream audio.');
      }
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data);
        handleTranscriptionPayload(data);
      } catch (error) {
        console.error('Failed to parse transcription payload:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Transcription WebSocket error:', error);
      setTranscriptionStatus('error');
      setTranscriptionMessage('Transcription connection failed. Check if service is running on port 2592.');
      setIsTranscriptionConnected(false);

      if (isInternalRecordingRef.current) {
        stopInternalRecording({ resetAutoStart: true });
        setRecordingMessage('Recording stopped due to transcription error.');
      }
    };

    ws.onclose = () => {
      transcriptionWsRef.current = null;
      setIsTranscriptionConnected(false);

      if (componentUnmountedRef.current) return;

      setTranscriptionStatus(prev => (prev === 'error' ? 'error' : 'idle'));
      setTranscriptionMessage('Transcription service disconnected. Attempting to reconnect...');

      if (isInternalRecordingRef.current) {
        stopInternalRecording({ resetAutoStart: true });
        setRecordingMessage('Recording stopped due to transcription disconnection.');
      }

      transcriptionReconnectTimerRef.current = window.setTimeout(() => {
        connectTranscriptionWebSocket();
      }, 3000);
    };
  }, [handleTranscriptionPayload, transcriptionWsUrl, isRecording, stopInternalRecording]);

  // Auto-connect transcription service
  useEffect(() => {
    connectTranscriptionWebSocket();

    return () => {
      componentUnmountedRef.current = true;

      if (transcriptionReconnectTimerRef.current) {
        window.clearTimeout(transcriptionReconnectTimerRef.current);
      }
      if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
        transcriptionWsRef.current.close();
      }

      stopInternalRecording({ resetAutoStart: true });
    };
  }, [connectTranscriptionWebSocket, stopInternalRecording]);

  useEffect(() => {
    if (!isVisible) {
      if (autoStartTimerRef.current) {
        window.clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }

      if (!isInternalRecordingRef.current) {
        hasAutoStartedRef.current = false;
      }

      return;
    }

    if (!isTranscriptionConnected || transcriptionStatus !== 'ready') {
      return;
    }

    if (isRecording || internalRecording || isInternalRecordingRef.current || hasAutoStartedRef.current) {
      return;
    }

    if (autoStartTimerRef.current) {
      return;
    }

    autoStartTimerRef.current = window.setTimeout(() => {
      autoStartTimerRef.current = null;
      hasAutoStartedRef.current = true;
      startInternalRecording();
    }, 1000);

    return () => {
      if (autoStartTimerRef.current) {
        window.clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    };
  }, [isVisible, isTranscriptionConnected, transcriptionStatus, isRecording, internalRecording, startInternalRecording]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isRecording, isPaused]);

  const handleAIAction = (option: string) => {
    setSelectedOption(option);
    setIsDialogOpen(false);
    // TODO: Implement actual AI functionality for each option
    console.log(`AI action selected: ${option}`);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 ${themeClasses.background}`}>
      <div className="h-full flex flex-col">
        {/* Enhanced Header */}
        {!isMinimalMode && (
          <MeetingHeader
            isRecording={isRecording}
            isPaused={isPaused}
            recordingTime={recordingTime}
            isConnected={isConnected}
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={resetZoom}
            onEnterMinimal={() => setIsMinimalMode(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onExitFullscreen={onExitFullscreen}
            onToggleTranscript={() => setShowTranscript(!showTranscript)}
            showTranscript={showTranscript}
            title={initialTitle}
            darkModeTextClasses={themeClasses.text.primary}
            themeClasses={themeClasses}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Enhanced Left Panel */}
          {!isMinimalMode && (
            <LeftPanel
              title={initialTitle}
              agenda={initialAgenda}
              showAgenda={showAgenda}
              isDarkMode={isDarkMode}
              onPauseToggle={() => setIsPaused(!isPaused)}
              isPaused={isPaused}
              isRecording={isRecording}
              onStopRecording={onStopRecording}
              onOpenAIDialog={() => setIsDialogOpen(true)}
              themeClasses={themeClasses}
            />
          )}

          {/* Enhanced Right Panel - Transcription */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {showTranscript && (
              <TranscriptArea
                showTranscript={showTranscript}
                showGroupChat={showGroupChat}
                partialText={partialText}
                finalText={finalText}
                themeClasses={themeClasses}
                zoomLevel={zoomLevel}
                pulseAnimation={pulseAnimation}
              />
            )}

            {/* Enhanced Status bar */}
            {!isMinimalMode && (
              <StatusBar
                isConnected={isConnected}
                themeClasses={themeClasses}
              />
            )}
          </div>
        </div>

        {/* Real-time Transcript Display at Bottom */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${themeClasses.background} border-t ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'}`}>
          {/* Connection Status Indicator */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-dashed border-muted-foreground/20">
            <div className="flex items-center gap-2">
              {isTranscriptionConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">Live Transcription</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-600 dark:text-red-400">Transcription Offline</span>
                </>
              )}
              {internalRecording && (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-red-600 dark:text-red-400">
                    AUTO-REC {Math.floor(internalRecordingTime / 60)}:{(internalRecordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {recordingMessage && (
                <span className="text-xs text-muted-foreground">
                  {recordingMessage}
                </span>
              )}
              {transcriptionMessage && (
                <span className="text-xs text-muted-foreground">
                  {transcriptionMessage}
                </span>
              )}
              {/* Recording Controls */}
              {!internalRecording ? (
                <button
                  onClick={startInternalRecording}
                  disabled={!isTranscriptionConnected}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTranscriptionConnected ? 'Start Auto-Record' : 'Service Offline'}
                </button>
              ) : (
                <button
                  onClick={() => stopInternalRecording()}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Transcript Content - Max 3 rows with smooth scrolling */}
          <div className="max-h-24 overflow-hidden">
            <div className="px-4 py-3 space-y-2">
              {/* Partial/Live Segment */}
              {partialSegment && (
                <div className="animate-pulse">
                  <p className="text-sm leading-relaxed text-yellow-700 dark:text-yellow-300">
                    {partialSegment.text}
                  </p>
                </div>
              )}

              {/* Final Segments - Show last 3 */}
              {transcriptSegments.slice(0, 3).map((segment, index) => {
                const actualIndex = transcriptSegments.length - 1 - index;
                return (
                  <div 
                    key={`${segment.startTime}-${actualIndex}`}
                    className="transition-all duration-300 ease-in-out transform"
                  >
                    <p className="text-sm leading-relaxed text-foreground">
                      {segment.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Floating Minimal Mode Toggle */}
        {isMinimalMode && (
          <MinimalModeToggle
            isDarkMode={isDarkMode}
            onExitMinimal={() => setIsMinimalMode(false)}
            themeClasses={themeClasses}
          />
        )}
        
        {/* Enhanced AI Dialog */}
        <AiActionsDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onActionSelect={handleAIAction}
          themeClasses={themeClasses}
        />
        
        {/* Settings Dialog */}
        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          showAgenda={showAgenda}
          onToggleAgenda={setShowAgenda}
          showGroupChat={showGroupChat}
          onToggleGroupChat={setShowGroupChat}
          isMinimalMode={isMinimalMode}
          onToggleMinimalMode={setIsMinimalMode}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={resetZoom}
          themeClasses={themeClasses}
        />
      </div>
    </div>
  );
};

export default MeetingDisplay;
