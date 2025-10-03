import {
  Meeting,
  Hotword,
  RecordingResponse,
  MeetingStatus,
} from '../types';
import {
  MeetingDocument,
  HotwordDocument,
  RecordingDocument,
} from '../types/documents';
import { ObjectId } from 'mongodb';

const toIsoString = (value?: Date): string | undefined => (value ? value.toISOString() : undefined);

export function meetingDocumentToMeeting(meetingDoc: MeetingDocument): Meeting {
  return {
    _id: meetingDoc._id,
    title: meetingDoc.title,
    agenda: meetingDoc.agenda,
    status: meetingDoc.status as MeetingStatus,
    createdAt: meetingDoc.createdAt,
    updatedAt: meetingDoc.updatedAt,
    scheduledStart: meetingDoc.scheduledStart,
    finalTranscript: meetingDoc.finalTranscript,
    parsedTodos: meetingDoc.parsedTodos,
    disputedIssues: meetingDoc.disputedIssues,
    summary: meetingDoc.summary,
    participants: meetingDoc.participants,
    ownerId: meetingDoc.ownerId,
    members: meetingDoc.members,
    recordings: meetingDoc.recordings,
    concatenatedRecording: meetingDoc.concatenatedRecording || undefined,
    recordingOrder: Array.isArray(meetingDoc.recordingOrder)
      ? meetingDoc.recordingOrder
          .map((entry, idx) => {
            if (!entry || !entry.recordingId) {
              return null;
            }
            const raw = entry.recordingId;
            const recordingId = raw instanceof ObjectId
              ? raw
              : ObjectId.isValid(raw)
                ? new ObjectId(raw)
                : null;
            if (!recordingId) {
              return null;
            }
            return {
              recordingId,
              index: typeof entry.index === 'number' ? entry.index : idx,
              enabled: entry.enabled !== false,
            };
          })
          .filter((value): value is { recordingId: ObjectId; index: number; enabled: boolean } => value !== null)
          .sort((a, b) => a.index - b.index)
          .map((entry, idx) => ({
            ...entry,
            index: idx,
          }))
      : undefined,
  };
}

export function hotwordDocumentToHotword(hotwordDoc: HotwordDocument): Hotword {
  const createdAt = typeof hotwordDoc.createdAt === 'string'
    ? new Date(hotwordDoc.createdAt)
    : hotwordDoc.createdAt;

  return {
    _id: hotwordDoc._id,
    word: hotwordDoc.word,
    createdAt,
    isActive: hotwordDoc.isActive,
    isPublic: !!hotwordDoc.isPublic,
    ownerId: hotwordDoc.ownerId,
  };
}

const toHex = (value?: ObjectId | null): string | undefined => (value ? value.toHexString() : undefined);

export function recordingDocumentToResponse(recordingDoc: RecordingDocument): RecordingResponse {
  return {
    _id: recordingDoc._id.toHexString(),
    meetingId: toHex(recordingDoc.meetingId),
    ownerId: toHex(recordingDoc.ownerId),
    originalFileName: (recordingDoc as any).originalFileName,
    createdAt: recordingDoc.createdAt.toISOString(),
    updatedAt: toIsoString(recordingDoc.updatedAt),
    duration: recordingDoc.duration,
    fileSize: recordingDoc.fileSize,
    transcription: recordingDoc.transcription,
    verbatimTranscript: recordingDoc.verbatimTranscript,
    speakerSegments: recordingDoc.speakerSegments,
    timeStampedNotes: recordingDoc.timeStampedNotes,
    alignmentItems: recordingDoc.alignmentItems,
    numSpeakers: recordingDoc.numSpeakers,
    sampleRate: recordingDoc.sampleRate,
    channels: recordingDoc.channels,
    format: recordingDoc.format,
    source: recordingDoc.source,
    kind: (recordingDoc as any).kind,
    organizedSpeeches: recordingDoc.organizedSpeeches,
  };
}
