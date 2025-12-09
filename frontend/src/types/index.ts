import * as baseTypes from '@base/types';

interface Timestamp {
  createdAt: string;
  updatedAt?: string;
}

interface Id {
  _id: string;
}

// Segmentation types
export interface SegmentationResponse {
  success: boolean;
  segments: SpeakerSegment[];
  textSegments?: string[] | null;
  message: string;
  fileProcessed: string | null;
}

export interface SegmentationRequest {
  audioFilePath: string;
  oracleNumSpeakers?: number;
  returnText?: boolean;
}

export type SegmentationModelInfo = baseTypes.SegmentationModelInfo;

// Common utility types
export interface FileUpload {
  file: File;
  name: string;
  size: number;
  type: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T;
  title: string;
  render?: (value: unknown, record: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Common API types
export interface ModelInfo {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  language: string;
  sampleRate: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    [key: string]: {
      status: 'up' | 'down';
      responseTime?: number;
    };
  };
}

// Audio and recording related types
export type SpeakerSegment = baseTypes.SpeakerSegment;

export type Recording = baseTypes.Recording & Id & Timestamp & { meeting?: Meeting };
export type RecordCreate = Partial<Recording> & Pick<Recording, 'originalFileName'>;
export type RecordUpdate = Partial<Recording> & Pick<Recording, '_id'>;

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

// Hotword management types
export type Hotword = baseTypes.Hotword & Id & Timestamp;

export type HotwordCreate = Pick<baseTypes.Hotword, 'word'> & { isPublic?: boolean };

export type HotwordUpdate = Partial<Hotword> & Pick<Hotword, '_id'> & { isPublic?: boolean };

export interface HotwordBulkImportResult {
  created: Hotword[];
  skipped: { word: string; reason: string }[];
}

export interface HotwordImportIssue {
  line: number;
  value: string;
  reason: 'empty' | 'too_short' | 'too_long' | 'invalid_chars' | 'duplicate';
}

export interface HotwordImportResponse extends HotwordBulkImportResult {
  invalid?: HotwordImportIssue[];
  duplicates?: string[];
  summary?: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    created: number;
    skipped: number;
  };
}

export type MeetingStatus = baseTypes.MeetingStatus;

export type Todo = baseTypes.Todo;

export type DisputedIssue = baseTypes.DisputedIssue;

export type AgendaItem = baseTypes.AgendaItem;

export type OrganizedSpeech = baseTypes.OrganizedSpeech;

export interface MeetingRecordingOrderItem {
  recordingId: baseTypes.ObjectIdLike;
  index: number;
  enabled: boolean;
}

type BaseMeeting = Omit<baseTypes.Meeting, 'recordingOrder'> & {
  recordingOrder?: MeetingRecordingOrderItem[];
};

export type Meeting = BaseMeeting &
  Id &
  Timestamp & {
    ownerId?: string;
    members?: string[];
    concatenatedRecording?: Recording | null;
    recordings?: Recording[];
    notes?: Note[];
  };

export type MeetingWithRecordings = Meeting & { recordings: Recording[] };

export type MeetingCreate = Pick<baseTypes.Meeting, 'title' | 'summary' | 'scheduledStart' | 'status' | 'agenda'>;

export type MeetingUpdate = Partial<Meeting> & Pick<Meeting, '_id'>;

// App customization config
export interface AppCustomization {
  appName: string;
  shortName?: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
  features?: {
    shorthandNotes?: boolean;
  };
  localLoginForm?: {
    locked?: boolean;
    message?: {
      en?: string;
      'zh-CN'?: string;
    };
    admin?: {
      locked?: boolean;
      message?: {
        en?: string;
        'zh-CN'?: string;
      };
    };
    redirectUrl?: string;
  };
}

export type SpeakerName = baseTypes.SpeakerName;

// Shorthand notes types
export type NoteStatus = baseTypes.NoteStatus;

export type Note = baseTypes.Note &
  Id &
  Timestamp & {
    meetingId?: string;
    ownerId?: string;
    meeting?: {
      _id: string;
      title: string;
      status: MeetingStatus;
      createdAt: string;
      updatedAt?: string;
    };
  };

export type NoteCreate = Pick<baseTypes.Note, 'title' | 'content' | 'status' | 'tags'> & {
  meetingId?: string;
};

export type NoteUpdate = Partial<Note> & Pick<Note, '_id'>;

// Proofing/AutoCorrect types
export interface ProofingChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface CorrectionPair {
  original: string;
  corrected: string;
}

export interface ProofingRequest {
  input: string;
  history: ProofingChatMessage[];
  systemContext?: {
    meetingId?: string;
    hotwords?: string[];
    speakerNames?: string[];
    meetingMembers?: string[];
  };
  corrections?: CorrectionPair[];
}

export interface ProofingResponse {
  output: string;
}
