import { useState, useRef, useEffect, useCallback } from 'react';
import { buildWsUrl } from '@/utils/ws';
import { apiService } from '@/services/api';

export interface AudioRecordingState {
  isRecording: boolean;
  partialText: string;
  finalText: string;
  recordingTime: number;
  isConnected: boolean;
  error: string | null;
}

export interface UseAudioRecordingOptions {
  wsUrl?: string;
  sampleRate?: number;
  language?: string;
  meetingId?: string;
  onRecordingComplete?: (data: {
    downloadUrl: string;
    transcription: string;
    duration: number;
  }) => void;
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}) {
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    partialText: '',
    finalText: '',
    recordingTime: 0,
    isConnected: false,
    error: null
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingInfoRef = useRef<{ recordingId?: string }>({});

  const cleanup = useCallback(() => {
    try {
      workletNodeRef.current?.disconnect();
    } catch (error) {
      console.error('Error disconnecting worklet:', error);
    }
    
    try {
      streamRef.current?.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
    
    try {
      audioContextRef.current?.close();
    } catch (error) {
      console.error('Error closing audio context:', error);
    }
    
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    
    audioContextRef.current = null;
    workletNodeRef.current = null;
    streamRef.current = null;
    timerRef.current = null;
    wsRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const startResponse = await apiService.startRecording(
        options.meetingId ? { meetingId: options.meetingId } : undefined
      );
      const recordingId =
        typeof startResponse?.id === 'string' && startResponse.id
          ? startResponse.id
          : undefined;

      if (!recordingId) {
        throw new Error('无法获取录音标识');
      }

      recordingInfoRef.current = { recordingId };

      const wsUrl = options.wsUrl
        ? (() => {
            try {
              const base = typeof window !== 'undefined' && window.location
                ? window.location.href
                : 'http://localhost';
              const url = new URL(options.wsUrl, base);
              url.searchParams.set('recordingId', recordingId);
              return url.toString();
            } catch {
              const delimiter = options.wsUrl.includes('?') ? '&' : '?';
              return `${options.wsUrl}${delimiter}recordingId=${encodeURIComponent(recordingId)}`;
            }
          })()
        : buildWsUrl('/ws/live-recorder', { recordingId });
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onopen = () => {
        console.info('🔗 WebSocket connected to backend');
        setState(prev => ({ ...prev, isConnected: true }));
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'ready':
            recordingInfoRef.current = {
              recordingId: typeof data.recordingId === 'string'
                ? data.recordingId
                : recordingInfoRef.current.recordingId
            };
            break;
          case 'chunk_received':
            // Silent acknowledgment
            break;
          case 'recording_saved':
            if (options.onRecordingComplete) {
              options.onRecordingComplete({
                downloadUrl: data.downloadUrl,
                transcription: '',
                duration: data.duration
              });
            }
            break;
          case 'error':
            setState(prev => ({ 
              ...prev, 
              error: data.message || 'WebSocket error'
            }));
            break;
        }
      };

      wsRef.current.onclose = () => {
        console.info('🔌 WebSocket disconnected from backend');
        setState(prev => ({ ...prev, isConnected: false }));
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.info('⚠️ WebSocket connection failed to backend');
        setState(prev => ({ 
          ...prev, 
          error: 'WebSocket connection error',
          isConnected: false 
        }));
      };

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

      // Connect audio chunks to WebSocket
      workletNodeRef.current.port.onmessage = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      source.connect(workletNodeRef.current);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
      }, 1000);

      setState(prev => ({ ...prev, isRecording: true, partialText: '' }));
    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '无法开始录音，请检查麦克风权限',
        isRecording: false,
        isConnected: false
      }));
      cleanup();
    }
  }, [cleanup, options]);

  const stopRecording = useCallback(() => {
    // Stop the timer and audio capture first
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    try {
      workletNodeRef.current?.disconnect();
    } catch (error) {
      console.error('Error disconnecting worklet:', error);
    }
    
    try {
      streamRef.current?.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
    
    try {
      audioContextRef.current?.close();
    } catch (error) {
      console.error('Error closing audio context:', error);
    }
    
    audioContextRef.current = null;
    workletNodeRef.current = null;
    streamRef.current = null;
    
    setState(prev => ({ 
      ...prev, 
      isRecording: false
    }));
    
    // Send stop message to backend, then close after receiving response
    // The backend will save the recording and send recording_saved message
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
        
        // Close WebSocket after a delay to allow backend to process and respond
        setTimeout(() => {
          try {
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
          } catch (error) {
            console.error('Error closing WebSocket:', error);
          }
        }, 2000); // 2 second timeout for backend to process
      }
    } catch (error) {
      console.error('Error sending stop message:', error);
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording
  };
}
