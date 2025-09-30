import { Document, ObjectId } from 'mongodb';
import {
  AgendaItem,
  Meeting,
  MeetingStatus,
  Recording,
  TodoItem,
  Hotword,
} from '../types';

export interface MeetingDocument extends Document {
  _id: ObjectId;
  title: string;
  agenda?: AgendaItem[];
  summary?: string;
  status: MeetingStatus;
  scheduledStart?: Date;
  finalTranscript?: string;
  parsedTodos?: TodoItem[];
  disputedIssues?: Meeting['disputedIssues'];
  participants?: number;
  createdAt: Date;
  updatedAt?: Date;
  recordings?: Recording[];
  combinedRecording?: Recording | null;
}

export interface HotwordDocument extends Document {
  _id: ObjectId;
  word: string;
  createdAt: Date | string;
  isActive: boolean;
}

export interface RecordingDocument extends Document, Omit<Recording, '_id'> {
  _id: ObjectId;
  meetingId?: ObjectId;
}

export const COLLECTIONS = {
  MEETINGS: 'meetings',
  HOTWORDS: 'hotwords',
  RECORDINGS: 'recordings',
} as const;
