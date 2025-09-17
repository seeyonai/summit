import { useState, useRef, useEffect, useCallback } from 'react';

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
  onRecordingComplete?: (data: {
    filename: string;
    downloadUrl: string;
    transcription: string;
    duration: number;
  }) => void;
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}) {
  const {
    wsUrl = `ws://localhost:2591/api/speech/ws`,
    sampleRate = 16000,
    language = 'zh',
    onRecordingComplete
  } = options;

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
  const wsRef = useRef<WebSocket | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
      }
    } catch (error) {
      console.error('Error closing WebSocket:', error);
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
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    
    audioContextRef.current = null;
    workletNodeRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
    timerRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setState(prev => ({ ...prev, error: null }));

    try {
      // Initialize WebSocket
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.binaryType = 'arraybuffer';

      wsRef.current.onopen = () => {
        wsRef.current?.send(JSON.stringify({
          type: 'start',
          sampleRate,
          lang: language
        }));
        setState(prev => ({ ...prev, isConnected: true }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const msg = JSON.parse(event.data);
            if (msg.type === 'partial') {
              setState(prev => ({ ...prev, partialText: msg.text }));
            }
            if (msg.type === 'final') {
              setState(prev => ({ 
                ...prev, 
                finalText: prev.finalText ? prev.finalText + '\n' + msg.text : msg.text,
                partialText: ''
              }));
            }
            if (msg.type === 'audio_complete') {
              const backendHostname = location.hostname || 'localhost';
              const backendBaseUrl = `${location.protocol}//${backendHostname}:2591`;
              onRecordingComplete?.({
                filename: msg.filename,
                downloadUrl: backendBaseUrl + msg.download_url,
                transcription: stateRef.current.finalText,
                duration: stateRef.current.recordingTime
              });
            }
            if (msg.type === 'error') {
              setState(prev => ({ ...prev, error: msg.message }));
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        setState(prev => ({ 
          ...prev, 
          error: '连接语音识别服务失败',
          isConnected: false 
        }));
      };

      wsRef.current.onclose = () => {
        setState(prev => ({ ...prev, isConnected: false }));
      };

      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 48000 });
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

      workletNodeRef.current.port.onmessage = (e) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(e.data);
        }
      };

      source.connect(workletNodeRef.current);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
      }, 1000);

      setState(prev => ({ ...prev, isRecording: true, partialText: '' }));

    } catch (err) {
      console.error('Error starting recording:', err);
      setState(prev => ({ 
        ...prev, 
        error: '无法访问麦克风，请检查权限设置',
        isRecording: false 
      }));
      cleanup();
    }
  }, [wsUrl, sampleRate, language, onRecordingComplete, cleanup]);

  const stopRecording = useCallback(() => {
    cleanup();
    setState(prev => ({ 
      ...prev, 
      isRecording: false, 
      partialText: '' 
    }));
  }, [cleanup]);

  const resetRecording = useCallback(() => {
    setState({
      isRecording: false,
      partialText: '',
      finalText: '',
      recordingTime: 0,
      isConnected: false,
      error: null
    });
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording
  };
}
