export interface SpeakerSegment {
  startTime: number;
  endTime: number;
  speakerIndex: number;
}

export interface SpeakerName {
  index: number;
  name: string;
}

export interface OrganizedSpeech {
  speakerIndex: number;
  startTime: number;
  endTime: number;
  rawText: string;
  polishedText: string;
}

export interface TimeStampedNote {
  timestamp: number;
  text: string;
}

export interface AlignmentItem {
  key: string;
  text: string;
  timestamp: number[][];
}

export type ObjectIdLike = string | { toString(): string };

export interface MeetingRecordingOrderItem {
  recordingId: ObjectIdLike;
  index: number;
  enabled: boolean;
}

export interface Recording {
  originalFileName?: string;
  duration?: number;
  fileSize?: number;
  transcription?: string;
  verbatimTranscript?: string;
  speakerSegments?: SpeakerSegment[];
  speakerNames?: SpeakerName[];
  timeStampedNotes?: TimeStampedNote[];
  alignmentItems?: AlignmentItem[];
  numSpeakers?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  source?: 'live' | 'upload' | 'concatenated';
  // meeting?: Meeting; // meeting is frontend only
  hotwords?: string[];
  organizedSpeeches?: OrganizedSpeech[];
  createdAt?: Date;
  metadata?: {
    duration?: number;
    sampleRate?: number;
    channels?: number;
    bitrate?: number | null;
    codec?: string | null;
    container?: string | null;
    title?: string | null;
    artist?: string | null;
    album?: string | null;
    year?: number | null;
    genre?: string[] | null;
    comment?: string | null;
  };
}

export type RecordingUpdate = Partial<Recording>;

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed';

export interface TodoItem {
  id?: string;
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignee?: string;
}

export interface DisputedIssue {
  id?: string;
  text: string;
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'resolved' | 'ongoing' | 'pending';
  resolved?: boolean;
}

export interface AgendaItem {
  order: number;
  text: string;
  status: 'resolved' | 'ongoing' | 'pending';
}

export interface Meeting {
  title: string;
  agenda?: AgendaItem[];
  status: MeetingStatus;
  scheduledStart?: Date;
  finalTranscript?: string;
  summary?: string;
  parsedTodos?: TodoItem[];
  disputedIssues?: DisputedIssue[];
  participants?: number;
  // recordings?: Recording[]; // recordings are frontend only
  recordingOrder?: MeetingRecordingOrderItem[];
  concatenatedRecording?: Recording | null;
}

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

export interface SegmentationModelInfo {
  model: string;
  modelRevision: string;
  task: string;
  available: boolean;
  description: string;
}

export interface SpeechModelInfo {
  name: string;
  description: string;
  version: string;
  language: string;
  sampleRate: number;
  streaming: boolean;
  chunkSize: number;
}

// Hotword management types
export interface Hotword {
  word: string;
  isActive: boolean;
  isPublic?: boolean;
  ownerId?: string;
}
