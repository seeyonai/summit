import * as baseTypes from "@base/types";
import { ObjectId } from "mongodb";

export type SpeakerSegment = baseTypes.SpeakerSegment;

interface Timestamp {
  createdAt: Date;
  updatedAt?: Date;
}

interface Id {
  _id: ObjectId;
}

export type Recording = baseTypes.Recording & Timestamp & Id;

export interface RecordingResponse {
  _id: ObjectId;
  filePath: string;
  filename: string;
  createdAt: string;
  updatedAt?: string;
  duration?: number;
  fileSize?: number;
  transcription?: string;
  verbatimTranscript?: string;
  speakerSegments?: SpeakerSegment[];
  numSpeakers?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  externalId?: string;
  source?: 'live' | 'upload';
  meeting?: {
    _id: ObjectId;
    title: string;
    status: MeetingStatus;
    createdAt: Date;
    updatedAt?: Date;
    scheduledStart?: Date;
    summary?: string;
    participants?: number;
  };
}

interface MeetingId {
  meetingId?: ObjectId;
}

export type RecordingCreate = baseTypes.Recording & MeetingId;

export type RecordingUpdate = baseTypes.RecordingUpdate & MeetingId;

export type MeetingStatus = baseTypes.MeetingStatus;

export type TodoItem = baseTypes.TodoItem;

export type DiscussionPoint = baseTypes.DiscussionPoint;

export type AgendaItem = baseTypes.AgendaItem;

export type Meeting = baseTypes.Meeting & Timestamp & Id;

export type MeetingCreate = baseTypes.Meeting;

export type MeetingUpdate = Partial<Pick<
  Meeting,
  '_id' | 
  'title' | 
  'summary' | 
  'status' | 
  'scheduledStart' | 
  'finalTranscript' | 
  'participants' |
  'combinedRecording'
>> & Pick<Meeting, '_id'>;


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
export type Hotword = baseTypes.Hotword & Timestamp & Id;

export type HotwordCreate = baseTypes.Hotword;

export type HotwordUpdate = Pick<Hotword, 'word' | 'isActive'>;
