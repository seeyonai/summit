export interface AudioConfig {
  wsUrl: string;
  sampleRate: number;
  language: string;
  chunkSize: number;
  audioConstraints: MediaStreamConstraints;
}

function computeWsUrl(path: string): string {
  if (typeof window !== 'undefined' && window.location) {
    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss' : 'ws';
    const host = window.location.hostname;
    const port = window.location.port === '2590' ? '2591' : window.location.port;
    const hostport = port ? `${host}:${port}` : host;
    return `${protocol}://${hostport}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return `ws://localhost:2591${path.startsWith('/') ? path : `/${path}`}`;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  wsUrl: computeWsUrl('/api/speech/ws'),
  sampleRate: 16000,
  language: 'zh',
  chunkSize: 600,
  audioConstraints: {
    audio: {
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
    }
  }
};

class AudioService {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;

  async initializeAudioContext(): Promise<AudioContext> {
    if (this.audioContext) {
      return this.audioContext;
    }

    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    await this.audioContext.audioWorklet.addModule('/pcm-worklet.js');
    
    return this.audioContext;
  }

  async getMicrophoneStream(constraints: MediaStreamConstraints = DEFAULT_AUDIO_CONFIG.audioConstraints): Promise<MediaStream> {
    if (this.stream) {
      return this.stream;
    }

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);

    return this.stream;
  }

  async createAudioWorklet(): Promise<AudioWorkletNode> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm16-downsampler', {
      numberOfInputs: 1,
      numberOfOutputs: 0
    });

    return this.workletNode;
  }

  cleanup(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = bytes;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  }
}

export const audioService = new AudioService();
