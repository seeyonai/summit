// Application configuration
export const APP_CONFIG = {
  // App info
  NAME: 'Summit AI',
  VERSION: '1.0.0',
  
  // UI settings
  THEME: {
    DEFAULT: 'light',
    SUPPORTED: ['light', 'dark'],
  },
  
  // Routing
  ROUTES: {
    HOME: '/',
    DASHBOARD: '/',
    RECORDINGS: '/recordings',
    RECORDING_DETAIL: '/recordings/:id',
    MEETINGS: '/meetings',
    MEETING_DETAIL: '/meetings/:id',
    HOTWORDS: '/hotwords',
    TOOLS: '/tools',
    SEGMENTATION: '/segmentation',
    OFFLINE: '/offline',
  },
  
  // Navigation
  NAVIGATION: {
    ITEMS: [
      { path: '/', label: '开始', icon: 'LayoutDashboard' },
      { path: '/recordings', label: '录音管理', icon: 'Folder' },
      { path: '/meetings', label: '会议管理', icon: 'Users' },
      { path: '/hotwords', label: '热词管理', icon: 'Flame' },
      { path: '/tools', label: '工具', icon: 'Wrench' },
    ],
  },
  
  // Feature flags
  FEATURES: {
    OFFLINE_TRANSCRIPTION: true,
    SPEAKER_SEGMENTATION: true,
    REAL_TIME_RECOGNITION: true,
    FLOATING_PANEL: true,
    DARK_MODE: true,
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  },
  
  // Timeouts
  TIMEOUTS: {
    API_REQUEST: 30000, // 30 seconds
    WEBSOCKET_CONNECT: 10000, // 10 seconds
    AUDIO_INITIALIZATION: 5000, // 5 seconds
  },
} as const;