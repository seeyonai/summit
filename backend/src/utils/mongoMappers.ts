import { Meeting, Hotword, Note, Recording, RecordingResponse, MeetingStatus } from '../types';
import { MeetingDocument, HotwordDocument, NoteDocument, RecordingDocument } from '../types/documents';
import { ObjectId } from 'mongodb';
import { normalizeAgendaItems } from './agendaUtils';

const toIsoString = (value?: Date): string | undefined => (value ? value.toISOString() : undefined);

const normalizeRecording = (recording?: Recording | null): Recording | null | undefined => {
  if (recording === undefined || recording === null) {
    return recording;
  }
  const createdAt = recording.createdAt instanceof Date ? recording.createdAt : new Date(recording.createdAt);
  const updatedAt = recording.updatedAt instanceof Date || recording.updatedAt === undefined ? recording.updatedAt : new Date(recording.updatedAt);
  return {
    ...recording,
    createdAt,
    updatedAt,
  };
};

const normalizeRecordings = (recordings?: Recording[] | null): Recording[] | undefined => {
  if (!recordings) {
    return undefined;
  }
  return recordings.map((recording) => normalizeRecording(recording)).filter((value): value is Recording => value !== undefined && value !== null);
};

const normalizeNotes = (notes?: Note[] | null): Note[] | undefined => {
  if (!notes || !Array.isArray(notes)) {
    return undefined;
  }
  return notes.map((note) => noteDocumentToNote(note as any));
};

export function meetingDocumentToMeeting(meetingDoc: MeetingDocument): Meeting {
  return {
    _id: meetingDoc._id,
    title: meetingDoc.title,
    agenda: normalizeAgendaItems(meetingDoc.agenda),
    status: meetingDoc.status as MeetingStatus,
    createdAt: meetingDoc.createdAt,
    updatedAt: meetingDoc.updatedAt,
    scheduledStart: meetingDoc.scheduledStart,
    finalTranscript: meetingDoc.finalTranscript,
    todos: meetingDoc.todos,
    disputedIssues: meetingDoc.disputedIssues,
    summary: meetingDoc.summary,
    hotwords: Array.isArray(meetingDoc.hotwords) ? meetingDoc.hotwords : undefined,
    ownerId: meetingDoc.ownerId,
    members: meetingDoc.members,
    viewers: meetingDoc.viewers,
    recordings: normalizeRecordings(meetingDoc.recordings),
    concatenatedRecording: normalizeRecording(meetingDoc.concatenatedRecording),
    notes: normalizeNotes(meetingDoc.notes),
    recordingOrder: Array.isArray(meetingDoc.recordingOrder)
      ? meetingDoc.recordingOrder
          .map((entry, idx) => {
            if (!entry || !entry.recordingId) {
              return null;
            }
            const raw = entry.recordingId;
            const recordingId = raw instanceof ObjectId ? raw : ObjectId.isValid(raw) ? new ObjectId(raw) : null;
            if (!recordingId) {
              return null;
            }
            return {
              recordingId,
              index: typeof entry.index === 'number' ? entry.index : idx,
              enabled: entry.enabled !== false,
            };
          })
          .filter(
            (
              value
            ): value is {
              recordingId: ObjectId;
              index: number;
              enabled: boolean;
            } => value !== null
          )
          .sort((a, b) => a.index - b.index)
          .map((entry, idx) => ({
            ...entry,
            index: idx,
          }))
      : undefined,
  };
}

export function hotwordDocumentToHotword(hotwordDoc: HotwordDocument): Hotword {
  const createdAt = typeof hotwordDoc.createdAt === 'string' ? new Date(hotwordDoc.createdAt) : hotwordDoc.createdAt;

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
    label: (recordingDoc as any).label,
    originalFileName: recordingDoc.originalFileName,
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
    speakerNames: recordingDoc.speakerNames,
    hotwords: recordingDoc.hotwords,
    organizedSpeeches: recordingDoc.organizedSpeeches,
  };
}

export function noteDocumentToNote(noteDoc: NoteDocument): Note {
  return {
    _id: noteDoc._id,
    title: noteDoc.title,
    content: noteDoc.content,
    status: noteDoc.status,
    tags: noteDoc.tags,
    meetingId: noteDoc.meetingId,
    ownerId: noteDoc.ownerId,
    createdAt: noteDoc.createdAt,
    updatedAt: noteDoc.updatedAt,
  };
}
