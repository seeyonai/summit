import * as baseTypes from "@base/types";
import { AlignmentItem, TimeStampedNote } from "@base/types";
import { ObjectId } from "mongodb";

export type SpeakerSegment = baseTypes.SpeakerSegment;

export interface MeetingRecordingOrderItem extends Omit<baseTypes.MeetingRecordingOrderItem, 'recordingId'> {
  recordingId: ObjectId;
}

interface Timestamp {
  createdAt: Date;
  updatedAt?: Date;
}

interface Id {
  _id: ObjectId;
}

export type Recording = baseTypes.Recording & Timestamp & Id & {
  meetingId?: ObjectId;
  ownerId?: ObjectId;
};

export interface RecordingResponse {
  _id: string;
  meetingId?: string;
  ownerId?: string;
  originalFileName?: string;
  createdAt: string;
  updatedAt?: string;
  duration?: number;
  fileSize?: number;
  transcription?: string;
  verbatimTranscript?: string;
  speakerSegments?: SpeakerSegment[];
  speakerNames?: baseTypes.SpeakerName[];
  timeStampedNotes?: TimeStampedNote[];
  alignmentItems?: AlignmentItem[];
  numSpeakers?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  source?: 'live' | 'upload' | 'concatenated';
  hotwords?: string[];
  organizedSpeeches?: Array<{
    speakerIndex: number;
    startTime: number;
    endTime: number;
    rawText: string;
    polishedText: string;
  }>;
  meeting?: {
    _id: string;
    title: string;
    status: MeetingStatus;
    createdAt: string;
    updatedAt?: string;
    scheduledStart?: string;
    summary?: string;
  };
}

interface MeetingId {
  meetingId?: ObjectId;
}

export type RecordingCreate = baseTypes.Recording & MeetingId;

export type RecordingUpdate = baseTypes.RecordingUpdate & MeetingId;

export type MeetingStatus = baseTypes.MeetingStatus;

export type TodoItem = baseTypes.TodoItem;

// DiscussionPoint type is not defined in baseTypes, removing reference
// export type DiscussionPoint = baseTypes.DiscussionPoint;

export type AgendaItem = baseTypes.AgendaItem;

type MeetingBase = Omit<baseTypes.Meeting, 'recordingOrder'> & {
  recordingOrder?: MeetingRecordingOrderItem[];
};

export type Meeting = MeetingBase & Timestamp & Id & {
  ownerId?: ObjectId;
  members?: ObjectId[];
  concatenatedRecording?: Recording | null;
  recordings?: Recording[];
};

export type MeetingCreate = Omit<baseTypes.Meeting, 'recordingOrder'> & {
  recordingOrder?: MeetingRecordingOrderItem[];
};

export type MeetingUpdate = Partial<Pick<
  Meeting,
  'title' |
  'summary' |
  'status' |
  'scheduledStart' |
  'finalTranscript' |
  'recordingOrder' |
  'hotwords'
>>;


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
export type Hotword = Omit<baseTypes.Hotword, 'ownerId' | 'isPublic'> & Timestamp & Id & {
  isPublic: boolean;
  ownerId?: ObjectId;
};

export type HotwordCreate = baseTypes.Hotword & {
  isPublic?: boolean;
};

export type HotwordUpdate = Pick<Hotword, '_id' | 'word' | 'isActive'> & {
  isPublic?: boolean;
};
