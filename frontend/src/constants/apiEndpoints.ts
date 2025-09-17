// API endpoints configuration
export const API_ENDPOINTS = {
  // Unified Backend Service (Port 2591)
  SPEECH: {
    HEALTH: '/health',
    MODEL_INFO: '/api/speech/model-info',
    WEBSOCKET: '/api/speech/ws',
    RECORDINGS: '/api/recordings',
    RECORDING_DETAIL: (id: string) => `/api/recordings/${id}`,
    START_RECORDING: '/api/recordings/start',
    TRANSCRIBE: (id: string) => `/api/recordings/${id}/transcribe`,
    POLISH: (id: string) => `/api/recordings/${id}/polish`,
  },
  
  // Backend API Service (Port 2591)
  BACKEND: {
    HEALTH: '/health',
    MEETINGS: '/api/meetings',
    MEETING_DETAIL: (id: string) => `/api/meetings/${id}`,
    HOTWORDS: '/api/hotwords',
    HOTWORD_DETAIL: (id: string) => `/api/hotwords/${id}`,
    SEGMENTATION: {
      MODEL_INFO: '/api/segmentation/model-info',
      ANALYZE: '/api/segmentation/analyze',
      UPLOAD: '/api/segmentation/upload',
    },
    RECORDINGS: '/api/recordings',
    RECORDING_DETAIL: (id: string) => `/api/recordings/${id}`,
    START_RECORDING: '/api/recordings/start',
    TRANSCRIBE: (id: string) => `/api/recordings/${id}/transcribe`,
    SEGMENT: (id: string) => `/api/recordings/${id}/segment`,
    POLISH: (id: string) => `/api/recordings/${id}/polish`,
  },
} as const;

// Service URLs
export const SERVICE_URLS = {
  SPEECH: 'http://localhost:2591',
  BACKEND: 'http://localhost:2591',
  SEGMENTATION: 'http://localhost:8001',
} as const;

// WebSocket URLs
export const WS_URLS = {
  SPEECH: (protocol = 'ws') => `${protocol}://localhost:2591/api/speech/ws`,
} as const;
