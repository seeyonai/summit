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
  ownerId?: ObjectId;
  members?: ObjectId[];
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
  ownerId?: ObjectId;
}

export const COLLECTIONS = {
  MEETINGS: 'meetings',
  HOTWORDS: 'hotwords',
  RECORDINGS: 'recordings',
  USERS: 'users',
} as const;

export interface UserDocument extends Document {
  _id: ObjectId;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  passwordHash: string;
  salt: string;
  createdAt: Date;
  updatedAt?: Date;
}
