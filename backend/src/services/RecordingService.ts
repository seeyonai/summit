import { promises as fs } from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { RecordingResponse, RecordingUpdate, SpeakerSegment, Meeting } from '../types';
import { getCollection } from '../config/database';
import { COLLECTIONS, RecordingDocument, MeetingDocument } from '../types/documents';
import { recordingDocumentToResponse, meetingDocumentToMeeting } from '../utils/mongoMappers';
import { SegmentationService } from './SegmentationService';
import { ensureTrailingSlash, HttpError, requestJson, uploadMultipart } from '../utils/httpClient';
import type { JsonRequestOptions } from '../utils/httpClient';
import { getMeetingById as getMeetingByIdService } from './MeetingService';
import { getFilesBaseDir, makeRelativeToBase, resolveExistingPathFromCandidate } from '../utils/filePaths';
import { badRequest, internal, notFound } from '../utils/errors';
import { getMimeType, normalizeTranscriptText } from '../utils/recordingHelpers';
import { debug } from '../utils/logger';

interface LiveRecordingStartResponse {
  id: string;
  filename: string;
  filePath: string;
  message?: string;
}

interface TranscriptionServiceResponse {
  text: string;
  processingTime: number;
  audioDuration?: number;
  fileSize?: number;
}

const LIVE_SERVICE_URL = process.env.LIVE_SERVICE_URL || 'http://localhost:2592';
const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL
  || process.env.TRANSCRIBE_SERVICE_URL
  || 'http://localhost:2594';

// Module-level singletons and constants
const RECORDINGS_DIR = getFilesBaseDir();
export const LIVE_SERVICE_BASE = ensureTrailingSlash(LIVE_SERVICE_URL);
export const TRANSCRIPTION_SERVICE_BASE = ensureTrailingSlash(TRANSCRIPTION_SERVICE_URL);
const segmentationService = new SegmentationService();

const MEETING_LOOKUP_FIELDS: Array<keyof Meeting> = [
  'title',
  'status',
  'createdAt',
  'updatedAt',
  'scheduledStart',
  'summary',
  'participants',
];

// Shared helpers
function recordingsCollection() {
  return getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
}

async function buildRecordingResponse(
  document: RecordingDocument,
  meetingFields?: Array<keyof Meeting>,
): Promise<RecordingResponse> {
  const response = recordingDocumentToResponse(document);

  if (!meetingFields?.length || !document.meetingId) {
    return response;
  }

  try {
    const meetingDoc = await getCollection<MeetingDocument>(COLLECTIONS.MEETINGS)
      .findOne({ _id: document.meetingId });

    if (!meetingDoc) {
      return response;
    }

    const meeting = meetingDocumentToMeeting(meetingDoc);
    const meetingPayload: Record<string, unknown> = {
      _id: meeting._id.toString(),
    };

    meetingFields.forEach((field) => {
      const value = meeting[field];
      if (value === undefined) {
        return;
      }

      if (field === 'createdAt' || field === 'updatedAt' || field === 'scheduledStart') {
        meetingPayload[field] = (value as Date).toISOString();
        return;
      }

      meetingPayload[field] = value;
    });

    response.meeting = meetingPayload as RecordingResponse['meeting'];
  } catch (error) {
    console.error(`Error looking up meeting for recording ${document._id.toString()}:`, error);
  }

  return response;
}

async function findRecording(recordingId: string): Promise<RecordingDocument | null> {
  const collection = recordingsCollection();

  if (ObjectId.isValid(recordingId)) {
    const byObjectId = await collection.findOne({ _id: new ObjectId(recordingId) });
    if (byObjectId) {
      return byObjectId;
    }
  }

  return collection.findOne({ externalId: recordingId });
}

async function findRecordingOrThrow(recordingId: string): Promise<RecordingDocument> {
  const document = await findRecording(recordingId);

  if (!document) {
    throw notFound('Recording not found', 'recording.not_found');
  }

  return document;
}

async function resolveAbsoluteFilePath(document: RecordingDocument): Promise<string> {
  const candidate = document.filePath || document.filename;
  return resolveExistingPathFromCandidate(RECORDINGS_DIR, candidate);
}

function getRelativeFilePath(document: RecordingDocument): string {
  return makeRelativeToBase(RECORDINGS_DIR, document.filePath || document.filename);
}

async function deleteRecordingFile(document: RecordingDocument): Promise<void> {
  try {
    const absolutePath = await resolveAbsoluteFilePath(document);
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

function buildLiveServiceUrl(pathname: string): string {
  return new URL(pathname, LIVE_SERVICE_BASE).toString();
}

function buildTranscriptionUrl(pathname: string): string {
  return new URL(pathname, TRANSCRIPTION_SERVICE_BASE).toString();
}

async function callLiveService<T>(pathname: string, options: JsonRequestOptions): Promise<T> {
  return requestJson<T>(buildLiveServiceUrl(pathname), options);
}

// Service API (functions over classes)
export async function getAllRecordings(): Promise<RecordingResponse[]> {
  const collection = recordingsCollection();
  const documents = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return Promise.all(documents.map((doc) => buildRecordingResponse(doc, MEETING_LOOKUP_FIELDS)));
}

export async function getRecordingsForUser(userId: string, includeMeeting: boolean = true): Promise<RecordingResponse[]> {
  const meetingsCol = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
  const uid = new ObjectId(userId);
  const accessibleMeetingIds = await meetingsCol
    .find({ $or: [ { ownerId: uid }, { members: { $elemMatch: { $eq: uid } } } ] }, { projection: { _id: 1 } as any })
    .toArray();
  const ids = accessibleMeetingIds.map((m) => m._id);
  const collection = recordingsCollection();
  const query: any = { $or: [ { ownerId: uid } ] };
  if (ids.length > 0) {
    query.$or.push({ meetingId: { $in: ids } });
  }
  const documents = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
  const meetingFields = includeMeeting ? MEETING_LOOKUP_FIELDS : undefined;
  return Promise.all(documents.map((doc) => buildRecordingResponse(doc, meetingFields)));
}

export async function getRecordingsByMeetingId(meetingId: string, includeMeeting: boolean = true): Promise<RecordingResponse[]> {
  if (!ObjectId.isValid(meetingId)) {
    throw badRequest('Invalid meeting ID', 'meeting.invalid_id');
  }

  const collection = recordingsCollection();
  const documents = await collection
    .find({ meetingId: new ObjectId(meetingId) })
    .sort({ createdAt: -1 })
    .toArray();
  const meetingFields = includeMeeting ? MEETING_LOOKUP_FIELDS : undefined;
  return Promise.all(documents.map((doc) => buildRecordingResponse(doc, meetingFields)));
}

export async function getRecordingById(recordingId: string): Promise<RecordingResponse> {
  const document = await findRecording(recordingId);

  if (!document) {
    throw notFound('Recording not found', 'recording.not_found');
  }

  return buildRecordingResponse(document, MEETING_LOOKUP_FIELDS);
}

export async function createRecording(recordingData: {
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  format: string;
  mimeType: string;
  createdAt: Date;
  duration: number;
  sampleRate: number;
  channels: number;
  ownerId: string;
  meetingId?: string;
}): Promise<RecordingResponse> {
  const now = new Date();

  const document: Omit<RecordingDocument, '_id'> = {
    filePath: recordingData.filePath,
    filename: recordingData.filename,
    createdAt: recordingData.createdAt,
    updatedAt: now,
    duration: recordingData.duration || undefined,
    fileSize: recordingData.fileSize || undefined,
    transcription: undefined,
    verbatimTranscript: undefined,
    speakerSegments: undefined,
    numSpeakers: undefined,
    sampleRate: recordingData.sampleRate || undefined,
    channels: recordingData.channels || undefined,
    format: recordingData.format || undefined,
    externalId: undefined,
    source: 'upload',
    ownerId: new ObjectId(recordingData.ownerId),
    meetingId: recordingData.meetingId && ObjectId.isValid(recordingData.meetingId) ? new ObjectId(recordingData.meetingId) : undefined,
  };

  const collection = recordingsCollection();
  const insertResult = await collection.insertOne(document as any);
  const inserted = await collection.findOne({ _id: insertResult.insertedId });

  if (!inserted) {
    throw internal('Failed to persist recording', 'recording.persist_failed');
  }

  return recordingDocumentToResponse(inserted);
}

export async function startRecording(ownerId: string, meetingId?: string): Promise<{ id: string; filename: string; filePath: string; message: string }> {
  const remoteResponse = await callLiveService<LiveRecordingStartResponse>('/api/recordings/start', {
    method: 'POST',
    body: {},
    expectedStatus: [200, 201],
  });

  const now = new Date();
  const filename = remoteResponse.filename || `recording-${now.getTime()}.wav`;
  const filePathValue = remoteResponse.filePath || `/files/${filename}`;

  const document: Omit<RecordingDocument, '_id'> = {
    filePath: filePathValue,
    filename,
    createdAt: now,
    updatedAt: now,
    duration: undefined,
    fileSize: undefined,
    transcription: undefined,
    verbatimTranscript: undefined,
    speakerSegments: undefined,
    numSpeakers: undefined,
    sampleRate: undefined,
    channels: undefined,
    format: undefined,
    externalId: remoteResponse.id,
    source: 'live',
    ownerId: new ObjectId(ownerId),
    meetingId: meetingId && ObjectId.isValid(meetingId) ? new ObjectId(meetingId) : undefined,
  };

  const collection = recordingsCollection();
  const insertResult = await collection.insertOne(document as any);
  const inserted = await collection.findOne({ _id: insertResult.insertedId });

  if (!inserted) {
    throw internal('Failed to persist recording', 'recording.persist_failed');
  }

  return {
    id: inserted._id.toHexString(),
    filename: inserted.filename,
    filePath: inserted.filePath,
    message: remoteResponse.message || 'Recording started',
  };
}

export async function updateRecording(recordingId: string, updateData: RecordingUpdate): Promise<{ message: string }> {
  const document = await findRecordingOrThrow(recordingId);

  const updates: Partial<RecordingDocument> = {};
  const remoteUpdates: Record<string, unknown> = {};

  if (typeof updateData.filename === 'string') {
    updates.filename = updateData.filename;
    remoteUpdates.filename = updateData.filename;
  }

  if (typeof updateData.transcription === 'string') {
    updates.transcription = updateData.transcription;
    remoteUpdates.transcription = updateData.transcription;
  }

  if (typeof updateData.verbatimTranscript === 'string') {
    updates.verbatimTranscript = updateData.verbatimTranscript;
    remoteUpdates.verbatimTranscript = updateData.verbatimTranscript;
  }

  if (Array.isArray(updateData.organizedSpeeches)) {
    updates.organizedSpeeches = updateData.organizedSpeeches;
    remoteUpdates.organizedSpeeches = updateData.organizedSpeeches;
  }

  if (Array.isArray(updateData.alignmentItems)) {
    updates.alignmentItems = updateData.alignmentItems;
    remoteUpdates.alignmentItems = updateData.alignmentItems;
  }

  if (Object.keys(updates).length === 0) {
    return { message: 'No changes applied' };
  }

  if (document.externalId) {
    await callLiveService(`/api/recordings/${document.externalId}`, {
      method: 'PUT',
      body: remoteUpdates,
      expectedStatus: [200],
    });
  }

  updates.updatedAt = new Date();

  const collection = recordingsCollection();
  await collection.updateOne({ _id: document._id }, { $set: updates });

  return { message: 'Recording updated' };
}

export async function deleteRecording(recordingId: string): Promise<{ message: string }> {
  const document = await findRecordingOrThrow(recordingId);
  const collection = recordingsCollection();

  if (document.externalId) {
    try {
      await callLiveService(`/api/recordings/${document.externalId}`, {
        method: 'DELETE',
        expectedStatus: [200, 204],
      });
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) {
        throw error;
      }
    }
  }

  await collection.deleteOne({ _id: document._id });
  await deleteRecordingFile(document).catch(() => undefined);

  return { message: 'Recording deleted' };
}

export async function addRecordingToMeeting(meetingId: string, recordingId: string): Promise<{ message: string }> {
  const recording = await findRecordingOrThrow(recordingId);

  if (!ObjectId.isValid(meetingId)) {
    throw badRequest('Invalid meeting ID', 'meeting.invalid_id');
  }

  const collection = recordingsCollection();
  await collection.updateOne(
    { _id: recording._id },
    { $set: { meetingId: new ObjectId(meetingId) } },
  );
  return { message: 'Recording attached to meeting' };
}

export async function transcribeRecording(recordingId: string, hotword?: string): Promise<{ message: string; transcription: string }> {
  const document = await findRecordingOrThrow(recordingId);
  const absolutePath = await resolveAbsoluteFilePath(document);
  debug('Transcribing recording:', absolutePath);
  const fileBuffer = await fs.readFile(absolutePath);
  const filename = path.basename(absolutePath);

  const formData: Record<string, string> = {};

  if (hotword && typeof hotword === 'string' && hotword.trim().length > 0) {
    formData.hotword = hotword.trim();
  }

  const transcriptionResponse = await uploadMultipart<TranscriptionServiceResponse>(
    buildTranscriptionUrl('/api/upload-transcribe'),
    {
      fieldName: 'file',
      filename,
      contentType: getMimeType(filename),
      buffer: fileBuffer,
    },
    Object.keys(formData).length > 0 ? formData : undefined
  );

  const updates: Partial<RecordingDocument> = {
    transcription: transcriptionResponse.text,
    updatedAt: new Date(),
  };

  if (typeof transcriptionResponse.audioDuration === 'number') {
    updates.duration = transcriptionResponse.audioDuration;
  }

  if (typeof transcriptionResponse.fileSize === 'number') {
    updates.fileSize = transcriptionResponse.fileSize;
  }

  const collection = recordingsCollection();
  await collection.updateOne({ _id: document._id }, { $set: updates });

  if (document.externalId) {
    await callLiveService(`/api/recordings/${document.externalId}`, {
      method: 'PUT',
      body: { transcription: transcriptionResponse.text },
      expectedStatus: [200],
    }).catch(() => undefined);
  }

  return {
    message: 'Transcription completed',
    transcription: transcriptionResponse.text,
  };
}

export async function segmentRecording(recordingId: string, oracleNumSpeakers?: number): Promise<{ message: string; segments: SpeakerSegment[] }> {
  const document = await findRecordingOrThrow(recordingId);
  debug('Segmenting recording:', document);
  const relativePath = getRelativeFilePath(document);

  const segmentationResult = await segmentationService.analyzeSegmentation({
    audioFilePath: relativePath,
    oracleNumSpeakers,
    returnText: false,
  });

  const segments = segmentationResult.segments;
  const uniqueSpeakers = new Set<number>();
  segments.forEach((segment) => uniqueSpeakers.add(segment.speakerIndex));

  const updates: Partial<RecordingDocument> = {
    speakerSegments: segments,
    numSpeakers: uniqueSpeakers.size || undefined,
    updatedAt: new Date(),
  };

  const collection = recordingsCollection();
  await collection.updateOne({ _id: document._id }, { $set: updates });

  return {
    message: segmentationResult.message,
    segments,
  };
}

export async function polishTranscription(recordingId: string): Promise<{ message: string; polishedTranscription: string }> {
  const document = await findRecordingOrThrow(recordingId);
  const sourceText = document.transcription || document.verbatimTranscript;

  if (!sourceText) {
    throw badRequest('No transcription available to polish', 'recording.transcription_missing');
  }

  const polished = normalizeTranscriptText(sourceText);

  const collection = recordingsCollection();
  await collection.updateOne(
    { _id: document._id },
    {
      $set: {
        verbatimTranscript: polished,
        updatedAt: new Date(),
      },
    }
  );

  return {
    message: 'Transcription polished',
    polishedTranscription: polished,
  };
}

export const recordingService = {
  getAllRecordings,
  getRecordingsForUser,
  getRecordingById,
  getRecordingsByMeetingId,
  createRecording,
  startRecording,
  updateRecording,
  deleteRecording,
  transcribeRecording,
  segmentRecording,
  polishTranscription,
  addRecordingToMeeting,
};

export default recordingService;
