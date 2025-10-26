// API endpoints configuration (relative paths)
export const API_ENDPOINTS = {
  // Unified Backend Service (Port 2591)
  SPEECH: {
    HEALTH: '/health',
    MODEL_INFO: '/api/speech/model-info',
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
    MEETING_EXTRACT_ANALYSIS: (id: string) => `/api/meetings/${id}/extract-analysis`,
    MEETING_TODO_ADVICE: (id: string) => `/api/meetings/${id}/todo-advice`,
    MEETING_UPDATE_TRANSCRIPT: (id: string) => `/api/meetings/${id}/final-transcript`,
    HOTWORDS: '/api/hotwords',
    HOTWORDS_BULK: '/api/hotwords/bulk',
    HOTWORDS_IMPORT: '/api/hotwords/import',
    HOTWORDS_EXPORT: '/api/hotwords/export',
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
