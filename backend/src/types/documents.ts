import { Document, ObjectId } from 'mongodb';
import {
  AgendaItem,
  Meeting,
  MeetingStatus,
  Note,
  Recording,
  Todo,
} from '../types';

export interface MeetingDocument extends Document {
  _id: ObjectId;
  title: string;
  agenda?: AgendaItem[];
  summary?: string;
  status: MeetingStatus;
  scheduledStart?: Date;
  finalTranscript?: string;
  todos?: Todo[];
  disputedIssues?: Meeting['disputedIssues'];
  createdAt: Date;
  updatedAt?: Date;
  hotwords?: string[];
  recordings?: Recording[];
  concatenatedRecording?: Recording | null;
  recordingOrder?: Meeting['recordingOrder'];
  notes?: Note[];
  ownerId?: ObjectId;
  members?: ObjectId[];
}

export interface HotwordDocument extends Document {
  _id: ObjectId;
  word: string;
  createdAt: Date | string;
  isActive: boolean;
  isPublic: boolean;
  ownerId?: ObjectId;
}

export interface RecordingDocument extends Document, Omit<Recording, '_id'> {
  _id: ObjectId;
  meetingId?: ObjectId;
  ownerId?: ObjectId;
}

export interface NoteDocument extends Document, Omit<Note, '_id'> {
  _id: ObjectId;
  meetingId?: ObjectId;
  ownerId?: ObjectId;
  createdAt: Date;
  updatedAt?: Date;
}

export const COLLECTIONS = {
  MEETINGS: 'meetings',
  HOTWORDS: 'hotwords',
  RECORDINGS: 'recordings',
  NOTES: 'notes',
  USERS: 'users',
} as const;

export interface UserDocument extends Document {
  _id: ObjectId;
  email: string;
  name?: string;
  aliases?: string;
  role: 'admin' | 'user';
  passwordHash: string;
  salt: string;
  externalUserId?: string;
  authType?: 'local' | 'unsafe_auth' | 'oauth';
  oauthCode?: string;
  oauthProvider?: string;
  createdAt: Date;
  updatedAt?: Date;
}
