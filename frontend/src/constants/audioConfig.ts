// Audio configuration constants
export const AUDIO_CONFIG = {
  
  // Audio settings
  SAMPLE_RATE: 16000,
  LANGUAGE: 'zh',
  CHUNK_SIZE_MS: 600,
  
  // Audio constraints
  AUDIO_CONSTRAINTS: {
    channelCount: 1,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
  } as MediaStreamConstraints,
  
  // Recording settings
  MAX_RECORDING_DURATION: 3600, // 1 hour in seconds
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds in milliseconds
  
  // Audio worklet settings
  WORKLET_NAME: 'pcm16-downsampler',
  WORKLET_PATH: '/pcm-worklet.js',
  
  // Visualization settings
  VISUALIZATION: {
    BAR_COUNT: 32,
    SMOOTHING_FACTOR: 0.8,
    MIN_BAR_HEIGHT: 2,
    MAX_BAR_HEIGHT: 100,
  },
} as const;

// Audio file formats
export const AUDIO_FORMATS = {
  SUPPORTED: ['wav', 'mp3', 'flac', 'm4a'],
  DEFAULT: 'wav',
  MIME_TYPES: {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
  },
} as const;

// Recording states
export const RECORDING_STATES = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;
