export interface SpeakerSegment {
  startTime: number;
  endTime: number;
  speakerIndex: number;
}

export interface TimeStampedNote {
  timestamp: number;
  text: string;
}

export interface Recording {
  filePath: string;
  filename: string;
  duration?: number;
  fileSize?: number;
  transcription?: string;
  verbatimTranscript?: string;
  speakerSegments?: SpeakerSegment[];
  timeStampedNotes?: TimeStampedNote[];
  numSpeakers?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  source?: 'live' | 'upload';
  externalId?: string;
  meeting?: Meeting;
}

export type RecordingUpdate = Partial<Recording>;

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed';

export interface TodoItem {
  id?: string;
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  dueDate?: string;
}

export interface DisputedIssue {
  id?: string;
  text: string;
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
  recordings?: Recording[];
  combinedRecording?: Recording;
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
}
