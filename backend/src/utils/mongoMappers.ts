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
    combinedRecording: meetingDoc.combinedRecording || undefined,
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
  };
}

export function recordingDocumentToResponse(recordingDoc: RecordingDocument): RecordingResponse {
  return {
    _id: recordingDoc._id.toString(),
    meetingId: recordingDoc.meetingId?.toString(),
    ownerId: recordingDoc.ownerId?.toString(),
    filePath: recordingDoc.filePath,
    filename: recordingDoc.filename,
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
    externalId: recordingDoc.externalId,
    source: recordingDoc.source,
    organizedSpeeches: recordingDoc.organizedSpeeches,
  };
}
