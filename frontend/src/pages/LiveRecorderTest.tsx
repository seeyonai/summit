import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { buildWsUrl } from '@/utils/ws';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Square, 
  Play, 
  Download,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  Copy,
  Trash2
} from 'lucide-react';

interface RecordingInfo {
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
}

declare global {
  interface Window {
    ECHO_STREAM_API_BASE?: string;
  }
}

const DEFAULT_TRANSCRIPTION_API_BASE = 'http://localhost:2592/';

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

function LiveRecorderTest() {
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
  const [transcriptionLatency, setTranscriptionLatency] = useState<number | null>(null);
  const [transcriptionConfidence, setTranscriptionConfidence] = useState<number | null>(null);
  const [transcriptionStats, setTranscriptionStats] = useState({ charCount: 0, wordCount: 0 });
  
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

  const transcriptionApiBase = useMemo(() => {
    const fallback = (() => {
      if (typeof window === 'undefined') {
        return DEFAULT_TRANSCRIPTION_API_BASE;
      }

      const { protocol, hostname } = window.location;
      if (protocol === 'file:' || !hostname) {
        return DEFAULT_TRANSCRIPTION_API_BASE;
      }

      return `${protocol}//${hostname}:2592/`;
    })();

    const metaBase = typeof document === 'undefined'
      ? undefined
      : document
          .querySelector('meta[name="echo-stream-api-base"]')
          ?.getAttribute('content');

    const configured = getLiveServiceUrlFromEnv()
      ?? (typeof window !== 'undefined' ? window.ECHO_STREAM_API_BASE : undefined)
      ?? metaBase;

    const hasProtocol = /^[a-zA-Z][\w+.-]*:/;

    const normalize = (value?: string | null) => {
      if (!value) {
        return null;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const attempt = (candidate: string) => {
        try {
          const url = new URL(candidate, fallback);
          const trimmedPath =
            url.pathname && url.pathname !== '/'
              ? url.pathname.replace(/\/$/, '')
              : '';
          const base = trimmedPath ? `${url.origin}${trimmedPath}` : url.origin;
          return base.endsWith('/') ? base : `${base}/`;
        } catch (error) {
          return null;
        }
      };

      if (!hasProtocol.test(trimmed)) {
        if (trimmed.startsWith('//')) {
          return attempt(`http:${trimmed}`) ?? attempt(`https:${trimmed}`);
        }

        if (trimmed.startsWith('/')) {
          return attempt(trimmed);
        }

        return attempt(`http://${trimmed}`);
      }

      return attempt(trimmed);
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSegmentTimestamp = (value?: number | null): string => {
    if (!value) {
      return '--:--:--';
    }

    return new Date(value).toLocaleTimeString();
  };

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

      if (typeof raw.timestamp === 'number') {
        setTranscriptionLatency(now - raw.timestamp);
      }

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
          isPartial: false
        };

        return [segment, ...prev];
      });

      setPartialSegment(null);
      partialSegmentRef.current = null;

      if (typeof raw.confidence === 'number') {
        setTranscriptionConfidence(raw.confidence);
      }

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
  }, []);

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

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(buildWsUrl('/ws/live-recorder'));
      
      ws.onopen = () => {
        setIsConnected(true);
        setStatus('ready');
        setMessage('WebSocket connected. Ready to record.');
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
            
          case 'recording_saved':
            setStatus('completed');
            setLastRecording(prev => ({
              ...prev,
              downloadUrl: data.downloadUrl,
              duration: data.duration,
              fileSize: data.fileSize,
              chunksCount: data.chunksCount
            }));
            setMessage(`Recording saved: ${data.filename} (${data.duration}s, ${data.fileSize} bytes)`);
            break;
            
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
        setMessage('WebSocket disconnected');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        setMessage('WebSocket connection error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setStatus('error');
      setMessage('Failed to connect to WebSocket server');
    }
  };

  const startRecording = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setMessage('Please connect to WebSocket first');
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
        setTranscriptionMessage('Waiting for transcription service connection...');
        connectTranscriptionWebSocket();
      }

      setTranscriptSegments([]);
      setPartialSegment(null);
      partialSegmentRef.current = null;
      setTranscriptionConfidence(null);
      setTranscriptionLatency(null);

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
          console.log('Sending audio chunk:', event.data.byteLength, 'bytes');
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
      setMessage('Recording started...');

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

  const reset = () => {
    stopRecording();
    setLastRecording(null);
    setStatus('idle');
    setMessage('');
    setIsConnected(false);
    setTranscriptSegments([]);
    setPartialSegment(null);
    partialSegmentRef.current = null;
    lastTranscriptionTypeRef.current = null;
    setTranscriptionStats({ charCount: 0, wordCount: 0 });
    setTranscriptionLatency(null);
    setTranscriptionConfidence(null);
    setTranscriptionMessage('');
  };

  const getTranscriptText = useCallback(() => {
    const ordered = [...transcriptSegments].reverse();
    const stableText = ordered.map(segment => segment.text).join(' ').trim();
    const partialText = (partialSegment ?? partialSegmentRef.current)?.text ?? '';
    const combined = [stableText, partialText].filter(Boolean).join(' ').trim();
    return combined;
  }, [partialSegment, transcriptSegments]);

  const clearTranscription = () => {
    setTranscriptSegments([]);
    setPartialSegment(null);
    partialSegmentRef.current = null;
    lastTranscriptionTypeRef.current = null;
    setTranscriptionStats({ charCount: 0, wordCount: 0 });
    setTranscriptionLatency(null);
    setTranscriptionConfidence(null);
    setTranscriptionMessage('Transcript cleared.');
  };

  const copyTranscription = async () => {
    const text = getTranscriptText();

    if (!text) {
      setTranscriptionMessage('No transcript available to copy yet.');
      return;
    }

    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        setTranscriptionMessage('Clipboard access is not available in this browser.');
        return;
      }

      await navigator.clipboard.writeText(text);
      setTranscriptionMessage('Transcript copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy transcript:', error);
      setTranscriptionMessage('Unable to copy transcript.');
    }
  };

  const downloadTranscription = () => {
    const text = getTranscriptText();

    if (!text) {
      setTranscriptionMessage('No transcript available to download yet.');
      return;
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live_transcript_${new Date().toISOString()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setTranscriptionMessage('Transcript downloaded.');
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
      wordCount: words
    });
  }, [partialSegment, transcriptSegments]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Live Recorder Test</h1>
          <p className="text-muted-foreground">
            Test WebSocket-based live audio recording functionality
          </p>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Wifi className="w-5 h-5 text-green-500" />
                      <span className="text-green-500">Recorder Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-5 h-5 text-red-500" />
                      <span className="text-red-500">Recorder Disconnected</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isTranscriptionConnected ? (
                    <>
                      <Wifi className="w-5 h-5 text-blue-500" />
                      <span className="text-blue-500">Transcription Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-5 h-5 text-muted-foreground" />
                      <span className="text-muted-foreground">Transcription Disconnected</span>
                    </>
                  )}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={status === 'error' ? 'destructive' : 'secondary'}>
                Status: {status.toUpperCase()}
              </Badge>
              {isRecording && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>
            
            {message && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm">{message}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!isConnected ? (
                <Button onClick={connectWebSocket} className="flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  Connect WebSocket
                </Button>
              ) : !isRecording ? (
                <Button 
                  onClick={startRecording} 
                  disabled={status !== 'ready'}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording} 
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </Button>
              )}
              
              <Button onClick={reset} variant="outline">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Transcription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Live Transcription</span>
              <Badge variant={isTranscriptionConnected ? 'secondary' : 'destructive'}>
                {isTranscriptionConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Words</p>
                <p className="text-lg font-semibold">{transcriptionStats.wordCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Characters</p>
                <p className="text-lg font-semibold">{transcriptionStats.charCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Latency</p>
                <p className="text-lg font-semibold">{transcriptionLatency !== null ? `${transcriptionLatency} ms` : '--'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Confidence</p>
                <p className="text-lg font-semibold">{transcriptionConfidence !== null ? `${Math.round(transcriptionConfidence * 100)}%` : '--'}</p>
              </div>
            </div>

            {transcriptionMessage && (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 p-3 text-sm text-muted-foreground">
                {transcriptionMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={copyTranscription} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={downloadTranscription} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={clearTranscription} variant="ghost">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border bg-background/80 p-3">
              {partialSegment && (
                <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
                    <span>Live Segment</span>
                    <span>{formatSegmentTimestamp(partialSegment.startTime)}</span>
                  </div>
                  <p className="mt-2 text-sm text-yellow-900 dark:text-yellow-100">{partialSegment.text}</p>
                </div>
              )}

              {transcriptSegments.length === 0 && !partialSegment && (
                <p className="text-sm italic text-muted-foreground">Transcript segments will appear here once available.</p>
              )}

              {transcriptSegments.map((segment, index) => {
                const segmentNumber = transcriptSegments.length - index;
                const key = `${segment.startTime ?? 'segment'}-${index}`;

                return (
                  <div key={key} className="rounded-md border bg-card p-3 shadow-sm">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                      <span>Segment {segmentNumber}</span>
                      <span>{formatSegmentTimestamp(segment.startTime)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{segment.text}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Last Recording Info */}
        {lastRecording && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Last Recording
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Filename:</span>
                  <p className="font-mono text-xs break-all">{lastRecording.filename}</p>
                </div>
                {lastRecording.duration && (
                  <div>
                    <span className="font-medium">Duration:</span>
                    <p>{lastRecording.duration}s</p>
                  </div>
                )}
                {lastRecording.fileSize && (
                  <div>
                    <span className="font-medium">File Size:</span>
                    <p>{(lastRecording.fileSize / 1024).toFixed(2)} KB</p>
                  </div>
                )}
                {lastRecording.chunksCount && (
                  <div>
                    <span className="font-medium">Audio Chunks:</span>
                    <p>{lastRecording.chunksCount}</p>
                  </div>
                )}
              </div>
              
              {lastRecording.downloadUrl && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(lastRecording.downloadUrl, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Recording
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Click "Connect WebSocket" to establish connection to the backend server</p>
            <p>2. Click "Start Recording" to begin capturing audio from your microphone</p>
            <p>3. Speak into your microphone - audio chunks will be streamed via WebSocket</p>
            <p>4. Click "Stop Recording" to end the session and save the audio file</p>
            <p>5. The recording will be saved to the /files directory and available for download</p>
          </CardContent>
        </Card>

        {/* Technical Info */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">WebSocket URL:</span>
                <p className="font-mono text-xs break-all">{buildWsUrl('/ws/live-recorder')}</p>
              </div>
              <div>
                <span className="font-medium">Transcription WS:</span>
                <p className="font-mono text-xs break-all">{transcriptionWsUrl}</p>
              </div>
              <div>
                <span className="font-medium">Audio Format:</span>
                <p>PCM 16-bit, 48kHz, Mono</p>
              </div>
              <div>
                <span className="font-medium">Output Format:</span>
                <p>WAV file with proper header</p>
              </div>
              <div>
                <span className="font-medium">Save Location:</span>
                <p>/files/ directory (configurable via FILE_BASE_PATH)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LiveRecorderTest;
