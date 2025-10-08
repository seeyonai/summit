import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

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
const TRANSCRIPTION_API_BASE = import.meta.env.VITE_TRANSCRIPTION_API_BASE;

export function useOngoingMeetingTranscription() {
  const [isTranscriptionConnected, setIsTranscriptionConnected] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'connecting' | 'ready' | 'listening' | 'error'>('idle');
  const [transcriptionMessage, setTranscriptionMessage] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptionSegment[]>([]);
  const [partialSegment, setPartialSegment] = useState<TranscriptionSegment | null>(null);
  const [transcriptionStats, setTranscriptionStats] = useState({ charCount: 0, wordCount: 0, segmentCount: 0 });
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Speaker 1');
  const [isListening, setIsListening] = useState(false);
  
  const transcriptionWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionReconnectTimerRef = useRef<number | null>(null);
  const transcriptionStartTimeRef = useRef<number | null>(null);
  const partialSegmentRef = useRef<TranscriptionSegment | null>(null);
  const lastTranscriptionTypeRef = useRef<string | null>(null);
  const componentUnmountedRef = useRef(false);
  const isListeningRef = useRef(false);

  const transcriptionWsUrl = useMemo(() => {
    try {
      const endpoint = new URL('api/ws', TRANSCRIPTION_API_BASE || window.location.origin);
      console.info('Live transcription endpoint:', endpoint);
      const protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${endpoint.host}${endpoint.pathname}${endpoint.search}`;
    } catch (e) {
      console.error('Failed to parse transcription API base:', e);
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
      if (isListeningRef.current) {
        const startMessage = {
          type: 'start',
          sample_rate: 16000
        };
        ws.send(JSON.stringify(startMessage));
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
      console.error('[DEBUG] Transcription WebSocket error:', error);
      console.error('Transcription WebSocket error:', error);
      setTranscriptionStatus('error');
      setTranscriptionMessage('Transcription connection error');
    };

    ws.onclose = (event) => {
      transcriptionWsRef.current = null;
      setIsTranscriptionConnected(false);

      if (componentUnmountedRef.current) {
        return;
      }

      setTranscriptionStatus(prev => (prev === 'error' ? 'error' : 'idle'));
      setTranscriptionMessage('Transcription disconnected. Attempting to reconnect...');

      transcriptionReconnectTimerRef.current = window.setTimeout(() => {
        console.warn('[DEBUG] Attempting to reconnect transcription WebSocket...');
        connectTranscriptionWebSocket();
      }, 3000);
    };
  }, [handleTranscriptionPayload, transcriptionWsUrl]);

  const startListening = async () => {
    try {
      if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
        const startMessage = {
          type: 'start',
          sample_rate: 16000
        };
        transcriptionWsRef.current.send(JSON.stringify(startMessage));
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

      // Connect to WebSocket for sending audio chunks to transcription
      workletNodeRef.current.port.onmessage = (event) => {
        if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
          transcriptionWsRef.current.send(event.data);
        }
      };

      source.connect(workletNodeRef.current);

      setIsListening(true);
      isListeningRef.current = true;

    } catch (error) {
      console.error('Error starting transcription:', error);
      setTranscriptionStatus('error');
      setTranscriptionMessage('Failed to start transcription. Please check microphone permissions.');
      isListeningRef.current = false;
    }
  };

  const stopListening = () => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (transcriptionWsRef.current && transcriptionWsRef.current.readyState === WebSocket.OPEN) {
      const stopMessage = { type: 'stop' };
      transcriptionWsRef.current.send(JSON.stringify(stopMessage));
      transcriptionStartTimeRef.current = null;
      if (transcriptionStatus !== 'error') {
        setTranscriptionStatus('ready');
      }
      setTranscriptionMessage('Transcription stopped.');
    }

    setIsListening(false);
    isListeningRef.current = false;
    
    // Reset refs
    workletNodeRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
  };

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
      stopListening();
    };
  }, [connectTranscriptionWebSocket]);

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
    isListening,
    isTranscriptionConnected,
    transcriptionStatus,
    transcriptionMessage,
    transcriptSegments,
    partialSegment,
    transcriptionStats,
    currentSpeaker,
    setCurrentSpeaker,
    startListening,
    stopListening,
    connectTranscriptionWebSocket
  };
}
