import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

export interface RecordingInfo {
  recordingId?: string;
  filename?: string;
  downloadUrl?: string;
  duration?: number;
  fileSize?: number;
  chunksCount?: number;
}

interface TranscriptionSegment {
  text: string;
  startTime: number | null;
  endTime?: number;
  isPartial: boolean;
  speaker?: string;
}

declare global {
  interface Window {
    ECHO_STREAM_API_BASE?: string;
  }
}

const isDev = window.location.port === '2592';
const PRODUCTION_TRANSCRIPTION_API_BASE = '/live/';
const DEFAULT_TRANSCRIPTION_API_BASE = isDev ? 'http://localhost:2592/' : PRODUCTION_TRANSCRIPTION_API_BASE;
const TRANSCRIPTION_API_BASE = import.meta.env.VITE_TRANSCRIPTION_API_BASE || DEFAULT_TRANSCRIPTION_API_BASE;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getLiveServiceUrlFromEnv = (): string | undefined => {
  const env = import.meta.env as Record<string, string | undefined>;
  const unprefixed = env?.LIVE_SERVICE_URL?.trim();
  if (unprefixed) {
    return unprefixed;
  }

  const prefixed = env?.VITE_LIVE_SERVICE_URL?.trim();
  if (prefixed) {
    return prefixed;
  }

  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const processValue = globalProcess?.env?.LIVE_SERVICE_URL?.trim();
  if (processValue) {
    return processValue;
  }

  return undefined;
};

export function useOngoingMeetingRecording(onRecordingComplete?: (recordingInfo: RecordingInfo) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [status, setStatus] = useState<'idle' | 'ready' | 'recording' | 'saving' | 'completed' | 'error'>('idle');
  const [lastRecording, setLastRecording] = useState<RecordingInfo | null>(null);
  const [message, setMessage] = useState('');
  const [isTranscriptionConnected, setIsTranscriptionConnected] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'connecting' | 'ready' | 'listening' | 'error'>('idle');
  const [transcriptionMessage, setTranscriptionMessage] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptionSegment[]>([]);
  const [partialSegment, setPartialSegment] = useState<TranscriptionSegment | null>(null);
  const [transcriptionStats, setTranscriptionStats] = useState({ charCount: 0, wordCount: 0, segmentCount: 0 });
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Speaker 1');
  
  const wsRef = useRef<WebSocket | null>(null);
  const transcriptionWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const transcriptionReconnectTimerRef = useRef<number | null>(null);
  const transcriptionStartTimeRef = useRef<number | null>(null);
  const partialSegmentRef = useRef<TranscriptionSegment | null>(null);
  const lastTranscriptionTypeRef = useRef<string | null>(null);
  const componentUnmountedRef = useRef(false);
  const isRecordingRef = useRef(false);

  const transcriptionWsUrl = useMemo(() => {
    try {
      const endpoint = new URL('api/ws', TRANSCRIPTION_API_BASE);
      const protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${endpoint.host}${endpoint.pathname}${endpoint.search}`;
    } catch {
      return 'ws://localhost:2592/api/ws';
    }
  }, []);

  const handleTranscriptionPayload = useCallback((raw: Record<string, unknown>) => {
    const type = typeof raw.type === 'string' ? raw.type : '';
    const now = Date.now();

    if (!type) {
      return;
    }

    if (type === 'partial') {
      const text = typeof raw.text === 'string' ? raw.text : '';
      lastTranscriptionTypeRef.current = 'partial';

      setPartialSegment(prev => {
        const base = prev ?? {
          text: '',
          startTime: now,
          isPartial: true,
          speaker: currentSpeaker
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
          isPartial: true,
          speaker: currentSpeaker
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

        if (!text) {
          return prev;
        }

        const segment: TranscriptionSegment = {
          text,
          startTime: partialSegmentRef.current?.startTime ?? now,
          endTime: now,
          isPartial: false,
          speaker: currentSpeaker
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
      return;
    }
  }, [currentSpeaker]);

  const connectTranscriptionWebSocket = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

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
      if (isRecordingRef.current) {
        ws.send(JSON.stringify({
          type: 'start',
          sample_rate: 16000
        }));
        transcriptionStartTimeRef.current = Date.now();
        setTranscriptionStatus('listening');
        setTranscriptionMessage('Transcription resumed.');
      } else {
        setTranscriptionStatus('ready');
        setTranscriptionMessage('Transcription service connected.');
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
      setTranscriptionMessage('Transcription connection error');
    };

    ws.onclose = () => {
      transcriptionWsRef.current = null;
      setIsTranscriptionConnected(false);

      if (componentUnmountedRef.current) {
        return;
      }

      setTranscriptionStatus(prev => (prev === 'error' ? 'error' : 'idle'));
      setTranscriptionMessage('Transcription disconnected. Attempting to reconnect...');

      transcriptionReconnectTimerRef.current = window.setTimeout(() => {
        connectTranscriptionWebSocket();
      }, 3000);
    };
  }, [handleTranscriptionPayload, transcriptionWsUrl]);

  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(`ws://${window.location.hostname}:2591/ws/live-recorder`);
      
      ws.onopen = () => {
        setIsConnected(true);
        setStatus('ready');
        setMessage('Recording system ready');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'ready':
            setStatus('ready');
            setLastRecording({
              recordingId: data.recordingId,
              filename: data.filename
            });
            setMessage(data.message);
            break;
            
          case 'chunk_received':
            console.log('Chunk acknowledged by server:', data.chunkSize, 'bytes, total:', data.totalChunks);
            break;
            
          case 'recording_saved': {
            setStatus('completed');
            const recordingInfo = {
              downloadUrl: data.downloadUrl,
              duration: data.duration,
              fileSize: data.fileSize,
              chunksCount: data.chunksCount,
              filename: data.filename,
              recordingId: data.recordingId
            };
            setLastRecording(recordingInfo);
            setMessage(`Recording saved: ${data.filename}`);
            if (onRecordingComplete) {
              onRecordingComplete(recordingInfo);
            }
            break;
          }

          case 'error':
            setStatus('error');
            setMessage(`Error: ${data.message}`);
            break;
            
          default:
            console.log('Received message:', data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatus('idle');
        setMessage('Recording system disconnected');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        setMessage('Connection error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setStatus('error');
      setMessage('Failed to connect to recording server');
    }
  }, [onRecordingComplete]);

  const startRecording = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setMessage('Connecting to recording system...');
      connectWebSocket();
      return;
    }

    try {
      if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
        transcriptionWsRef.current.send(JSON.stringify({
          type: 'start',
          sample_rate: 16000
        }));
        transcriptionStartTimeRef.current = Date.now();
        lastTranscriptionTypeRef.current = null;
        setTranscriptionStatus('listening');
        setTranscriptionMessage('Transcription started...');
      } else {
        setTranscriptionMessage('Waiting for transcription service...');
        connectTranscriptionWebSocket();
      }

      setTranscriptSegments([]);
      setPartialSegment(null);
      partialSegmentRef.current = null;

      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 16000 });
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

      // Connect to WebSocket for sending audio chunks
      workletNodeRef.current.port.onmessage = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }

        if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
          transcriptionWsRef.current.send(event.data);
        }
      };

      source.connect(workletNodeRef.current);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      setIsRecording(true);
      isRecordingRef.current = true;
      setStatus('recording');
      setMessage('Recording in progress...');

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('error');
      setMessage('Failed to start recording. Please check microphone permissions.');
      isRecordingRef.current = false;
    }
  };

  const stopRecording = () => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    // Close WebSocket connection to trigger saving
    if (wsRef.current) {
      wsRef.current.close();
    }

    if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
      transcriptionWsRef.current.send(JSON.stringify({ type: 'stop' }));
      transcriptionStartTimeRef.current = null;
      if (transcriptionStatus !== 'error') {
        setTranscriptionStatus('ready');
      }
      setTranscriptionMessage('Transcription stopped.');
    }

    setIsRecording(false);
    isRecordingRef.current = false;
    setRecordingTime(0);
    setStatus('saving');
    setMessage('Saving recording...');
    
    // Reset refs
    workletNodeRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    timerRef.current = null;
    wsRef.current = null;
  };

  useEffect(() => {
    connectWebSocket();
    connectTranscriptionWebSocket();

    return () => {
      componentUnmountedRef.current = true;
      if (transcriptionReconnectTimerRef.current) {
        window.clearTimeout(transcriptionReconnectTimerRef.current);
      }
      if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
        transcriptionWsRef.current.close();
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      stopRecording();
    };
  }, [connectTranscriptionWebSocket, connectWebSocket]);

  useEffect(() => {
    const texts = [
      partialSegment?.text ?? '',
      ...transcriptSegments.map(segment => segment.text)
    ].filter(Boolean);

    const combined = texts.join(' ').trim();
    const words = combined ? combined.split(/\s+/).filter(Boolean).length : 0;

    setTranscriptionStats({
      charCount: combined.length,
      wordCount: words,
      segmentCount: transcriptSegments.length
    });
  }, [partialSegment, transcriptSegments]);

  return {
    isRecording,
    isConnected,
    recordingTime,
    status,
    lastRecording,
    message,
    isTranscriptionConnected,
    transcriptionStatus,
    transcriptionMessage,
    transcriptSegments,
    partialSegment,
    transcriptionStats,
    currentSpeaker,
    setCurrentSpeaker,
    startRecording,
    stopRecording,
    connectWebSocket
  };
}
