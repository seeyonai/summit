import { ObjectId, Document } from 'mongodb';
import { 
  Meeting, 
  Recording, 
  Hotword, 
  SpeakerSegment,
  RecordingResponse} from '../types';
import { getCollection } from '../config/database';

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

// Helper functions to convert between MongoDB and application types
export function meetingToApp(meetingDoc: MeetingDocument): Meeting {
  return {
    _id: meetingDoc._id,
    title: meetingDoc.title,
    agenda: meetingDoc.agenda,
    status: meetingDoc.status,
    createdAt: meetingDoc.createdAt,
    updatedAt: meetingDoc.updatedAt,
    scheduledStart: meetingDoc.scheduledStart,
    finalTranscript: meetingDoc.finalTranscript,
    parsedTodos: meetingDoc.parsedTodos,
    disputedIssues: meetingDoc.disputedIssues,
    summary: meetingDoc.summary,
    participants: meetingDoc.participants,
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

// Enhanced recordingToApp with lookup option
export async function recordingToApp(
  recordingDoc: RecordingDocument, 
  options?: { 
    lookup?: Array<{
      meetingId: 'meeting';
      fields: (keyof Meeting)[];
    }>;
  }
): Promise<RecordingResponse> {
  const baseResponse: RecordingResponse = {
    _id: recordingDoc._id.toString(),
    filePath: recordingDoc.filePath,
    filename: recordingDoc.filename,
    createdAt: recordingDoc.createdAt.toISOString(),
    updatedAt: recordingDoc.updatedAt?.toISOString(),
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
    source: recordingDoc.source,
    organizedSpeeches: recordingDoc.organizedSpeeches
  };

  // If no lookup options provided, return base response
  if (!options?.lookup) {
    return baseResponse;
  }

  // Process lookup options
  const enhancedResponse: any = { ...baseResponse };
  
  for (const lookup of options.lookup) {
    if (lookup.meetingId === 'meeting' && recordingDoc.meetingId) {
      // Import meetingService dynamically to avoid circular dependencies
      try {
        const meetingDoc = await getCollection<MeetingDocument>(COLLECTIONS.MEETINGS).findOne({ _id: recordingDoc.meetingId });
        if (meetingDoc) {
          const meeting = meetingToApp(meetingDoc);
          enhancedResponse.meeting = {};
          
          // Include only specified fields
          for (const field of lookup.fields) {
            enhancedResponse.meeting[field] = meeting[field];
          }
        }
      } catch (error) {
        console.error(`Error looking up meeting: ${error}`);
      }
    }
  }
  
  return enhancedResponse;
}

// Convert application types to MongoDB documents
export function meetingToDoc(meeting: Meeting): Omit<MeetingDocument, '_id'> {
  return {
    title: meeting.title,
    agenda: meeting.agenda,
    summary: meeting.summary,
    status: meeting.status,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    scheduledStart: meeting.scheduledStart,
    finalTranscript: meeting.finalTranscript,
    parsedTodos: meeting.parsedTodos,
    disputedIssues: meeting.disputedIssues,
    participants: meeting.participants,
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
    source: recording.source,
    organizedSpeeches: recording.organizedSpeeches,
    meetingId: recording.meetingId
  };
}

// Re-export getCollection from database config
export { getCollection } from '../config/database';
