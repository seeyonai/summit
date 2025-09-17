import { ObjectId, Document } from 'mongodb';
import { 
  Meeting, 
  Recording, 
  Hotword, 
  SpeakerSegment} from '../types';

// MongoDB document interfaces
export interface MeetingDocument extends Document, Omit<Meeting, '_id'> {
  _id: ObjectId;
}

export interface HotwordDocument extends Document, Omit<Hotword, '_id'> {
  _id: ObjectId;
}

export interface RecordingDocument extends Document, Omit<Recording, '_id'> {
  _id: ObjectId;
  meetingId?: ObjectId;
}

// Database collection names
export const COLLECTIONS = {
  MEETINGS: 'meetings',
  HOTWORDS: 'hotwords',
  RECORDINGS: 'recordings'
} as const;

// Re-export getCollection from database config
export { getCollection } from '../config/database';

// Helper functions to convert between MongoDB and application types
export function meetingToApp(meetingDoc: MeetingDocument): Meeting {
  return {
    _id: meetingDoc._id,
    title: meetingDoc.title,
    description: meetingDoc.description,
    status: meetingDoc.status,
    createdAt: meetingDoc.createdAt,
    updatedAt: meetingDoc.updatedAt,
    scheduledStart: meetingDoc.scheduledStart,
    recordings: meetingDoc.recordings || [],
    finalTranscript: meetingDoc.finalTranscript,
    parsedTodos: meetingDoc.parsedTodos,
    discussionPoints: meetingDoc.discussionPoints,
    participants: meetingDoc.participants
  };
}

export function hotwordToApp(hotwordDoc: HotwordDocument): Hotword {
  return {
    _id: hotwordDoc._id,
    word: hotwordDoc.word,
    createdAt: hotwordDoc.createdAt,
    isActive: hotwordDoc.isActive
  };
}

export function recordingToApp(recordingDoc: RecordingDocument): Recording {
  return {
    _id: recordingDoc._id,
    filePath: recordingDoc.filePath,
    filename: recordingDoc.filename,
    createdAt: recordingDoc.createdAt,
    updatedAt: recordingDoc.updatedAt,
    duration: recordingDoc.duration,
    fileSize: recordingDoc.fileSize,
    transcription: recordingDoc.transcription,
    verbatimTranscript: recordingDoc.verbatimTranscript,
    speakerSegments: recordingDoc.speakerSegments,
    numSpeakers: recordingDoc.numSpeakers,
    sampleRate: recordingDoc.sampleRate,
    channels: recordingDoc.channels,
    format: recordingDoc.format,
    externalId: recordingDoc.externalId,
    source: recordingDoc.source
  };
}

// Convert application types to MongoDB documents
export function meetingToDoc(meeting: Meeting): Omit<MeetingDocument, '_id'> {
  return {
    title: meeting.title,
    description: meeting.description,
    status: meeting.status,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    scheduledStart: meeting.scheduledStart,
    recordings: meeting.recordings,
    finalTranscript: meeting.finalTranscript,
    parsedTodos: meeting.parsedTodos,
    discussionPoints: meeting.discussionPoints,
    participants: meeting.participants
  };
}

export function hotwordToDoc(hotword: Omit<Hotword, 'id'>): Omit<HotwordDocument, '_id'> {
  return {
    word: hotword.word,
    createdAt: hotword.createdAt,
    isActive: hotword.isActive
  };
}

export function recordingToDoc(recording: Omit<Recording, 'id'>): Omit<RecordingDocument, '_id'> {
  return {
    filePath: recording.filePath,
    filename: recording.filename,
    createdAt: recording.createdAt,
    updatedAt: recording.updatedAt,
    duration: recording.duration,
    fileSize: recording.fileSize,
    transcription: recording.transcription,
    verbatimTranscript: recording.verbatimTranscript,
    speakerSegments: recording.speakerSegments,
    numSpeakers: recording.numSpeakers,
    sampleRate: recording.sampleRate,
    channels: recording.channels,
    format: recording.format,
    externalId: recording.externalId,
    source: recording.source
  };
}
