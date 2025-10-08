import { promises as fs } from 'fs';
import path from 'path';
import { ObjectId, OptionalUnlessRequiredId } from 'mongodb';
import { RecordingResponse, RecordingUpdate, SpeakerSegment, Meeting } from '../types';
import { getCollection } from '../config/database';
import { COLLECTIONS, RecordingDocument, MeetingDocument } from '../types/documents';
import { recordingDocumentToResponse, meetingDocumentToMeeting } from '../utils/mongoMappers';
import { SegmentationService } from './SegmentationService';
import { ensureTrailingSlash, requestJson, uploadMultipart } from '../utils/httpClient';
import type { JsonRequestOptions } from '../utils/httpClient';
import { getFilesBaseDir, makeRelativeToBase, resolveExistingPathFromCandidate } from '../utils/filePaths';
import { badRequest, internal, notFound } from '../utils/errors';
import { getMimeType, normalizeTranscriptText } from '../utils/recordingHelpers';
import { debug } from '../utils/logger';
import { normalizeHotwords } from '../utils/hotwordUtils';
import { mergeHotwordsIntoMeeting } from './meetingHotwordHelpers';

interface TranscriptionServiceResponse {
  text: string;
  processingTime: number;
  audioDuration?: number;
  fileSize?: number;
}

const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL
  || process.env.TRANSCRIBE_SERVICE_URL
  || 'http://localhost:2594';

// Module-level singletons and constants
const RECORDINGS_DIR = getFilesBaseDir();
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

    const toIso = (v: unknown): string | undefined => {
      if (v instanceof Date) return v.toISOString();
      if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      return undefined;
    };

    meetingFields.forEach((field) => {
      const value = meeting[field];
      if (value === undefined) {
        return;
      }

      if (field === 'createdAt' || field === 'updatedAt' || field === 'scheduledStart') {
        const iso = toIso(value);
        if (iso) {
          meetingPayload[field] = iso;
        }
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

  return null;
}

async function findRecordingOrThrow(recordingId: string): Promise<RecordingDocument> {
  const document = await findRecording(recordingId);

  if (!document) {
    throw notFound('Recording not found', 'recording.not_found');
  }

  return document;
}

function inferExtension(format?: string): string {
  const f = (format || '').toLowerCase();
  if (!f) return 'wav';
  return f;
}

async function resolveAbsoluteFilePath(document: RecordingDocument): Promise<string> {
  const ext = inferExtension(document.format);
  const candidate = `${document._id.toString()}.${ext}`;
  return resolveExistingPathFromCandidate(RECORDINGS_DIR, candidate);
}

function getRelativeFilePath(document: RecordingDocument): string {
  const ext = inferExtension(document.format);
  const candidate = `${document._id.toString()}.${ext}`;
  return makeRelativeToBase(RECORDINGS_DIR, candidate);
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

function buildTranscriptionUrl(pathname: string): string {
  return new URL(pathname, TRANSCRIPTION_SERVICE_BASE).toString();
}

// Service API (functions over classes)
export async function getAllRecordings(limit?: number | 'all'): Promise<RecordingResponse[]> {
  const collection = recordingsCollection();
  const cursor = collection.find({}).sort({ createdAt: -1 });
  if (limit !== 'all') {
    cursor.limit(typeof limit === 'number' ? limit : 100);
  }
  const documents = await cursor.toArray();
  return Promise.all(documents.map((doc) => buildRecordingResponse(doc, MEETING_LOOKUP_FIELDS)));
}

export async function getRecordingsForUser(
  userId: string,
  includeMeeting: boolean = true,
  limit?: number | 'all',
): Promise<RecordingResponse[]> {
  const meetingsCol = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
  const uid = new ObjectId(userId);
  const accessibleMeetingIds = await meetingsCol
    .find({ $or: [ { ownerId: uid }, { members: { $elemMatch: { $eq: uid } } } ] }, { projection: { _id: 1 } })
    .toArray();
  const ids = accessibleMeetingIds.map((m) => m._id);
  const collection = recordingsCollection();
  const query: any = { $or: [ { ownerId: uid } ] };
  if (ids.length > 0) {
    query.$or.push({ meetingId: { $in: ids } });
  }
  const cursor = collection
    .find(query)
    .sort({ createdAt: -1 });

  if (limit !== 'all') {
    cursor.limit(typeof limit === 'number' ? limit : 100);
  }

  const documents = await cursor.toArray();
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
  originalFileName?: string;
  fileSize: number;
  format: string;
  mimeType: string;
  createdAt: Date;
  duration: number;
  sampleRate: number;
  channels: number;
  ownerId: string;
  meetingId?: string;
  source?: 'live' | 'upload' | 'concatenated';
  hotwords?: string[];
}): Promise<RecordingResponse> {
  const now = new Date();
  const normalizedHotwords = normalizeHotwords(recordingData.hotwords);

  const document: OptionalUnlessRequiredId<RecordingDocument> = {
    _id: new ObjectId(),
    originalFileName: recordingData.originalFileName,
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
    source: recordingData.source || 'upload',
    ownerId: recordingData.ownerId && ObjectId.isValid(recordingData.ownerId)
      ? new ObjectId(recordingData.ownerId)
      : undefined,
    meetingId: recordingData.meetingId && ObjectId.isValid(recordingData.meetingId) ? new ObjectId(recordingData.meetingId) : undefined,
    hotwords: normalizedHotwords && normalizedHotwords.length > 0 ? normalizedHotwords : undefined,
  };

  const collection = recordingsCollection();
  const insertResult = await collection.insertOne(document);
  const inserted = await collection.findOne({ _id: insertResult.insertedId });

  if (!inserted) {
    throw internal('Failed to persist recording', 'recording.persist_failed');
  }

  if (inserted.meetingId) {
    await mergeHotwordsIntoMeeting(inserted.meetingId, inserted.hotwords);
  }

  return recordingDocumentToResponse(inserted);
}

export async function startRecording(ownerId: string, meetingId?: string): Promise<{ id: string; message: string }> {
  if (!ownerId || !ObjectId.isValid(ownerId)) {
    throw badRequest('ownerId is required and must be a valid ObjectId', 'recording.missing_owner_id');
  }

  const now = new Date();
  // No on-disk filename is stored; the file is saved as <_id>.<ext>

  const document: OptionalUnlessRequiredId<RecordingDocument> = {
    _id: new ObjectId(),
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
    source: 'live',
    ownerId: new ObjectId(ownerId),
    meetingId: meetingId && ObjectId.isValid(meetingId) ? new ObjectId(meetingId) : undefined,
  };

  const collection = recordingsCollection();
  const insertResult = await collection.insertOne(document);
  const inserted = await collection.findOne({ _id: insertResult.insertedId });

  if (!inserted) {
    throw internal('Failed to persist recording', 'recording.persist_failed');
  }

  if (inserted.meetingId) {
    await mergeHotwordsIntoMeeting(inserted.meetingId, inserted.hotwords);
  }

  return {
    id: inserted._id.toHexString(),
    message:'录音已开始',
  };
}

export async function updateRecording(recordingId: string, updateData: RecordingUpdate): Promise<{ message: string }> {
  const document = await findRecordingOrThrow(recordingId);

  const updates: Partial<RecordingDocument> = {};
  const remoteUpdates: Record<string, unknown> = {};

  // filename removed; do not allow updating originalFileName via this endpoint

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

  if (Array.isArray(updateData.speakerNames)) {
    updates.speakerNames = updateData.speakerNames;
    remoteUpdates.speakerNames = updateData.speakerNames;
  }

  if (Array.isArray(updateData.alignmentItems)) {
    updates.alignmentItems = updateData.alignmentItems;
    remoteUpdates.alignmentItems = updateData.alignmentItems;
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'hotwords')) {
    const normalizedHotwords = normalizeHotwords(updateData.hotwords);
    updates.hotwords = normalizedHotwords && normalizedHotwords.length > 0 ? normalizedHotwords : [];
    remoteUpdates.hotwords = updates.hotwords;
  }

  if (Object.keys(updates).length === 0) {
    return { message: '未应用更改' };
  }

  // No live-service mirror updates without externalId

  updates.updatedAt = new Date();

  const collection = recordingsCollection();
  await collection.updateOne({ _id: document._id }, { $set: updates });

  return { message: '录音已更新' };
}

export async function deleteRecording(recordingId: string): Promise<{ message: string }> {
  const document = await findRecordingOrThrow(recordingId);
  const collection = recordingsCollection();

  // No remote deletion without externalId linkage

  await collection.deleteOne({ _id: document._id });
  await deleteRecordingFile(document).catch(() => undefined);

  return { message: '录音已删除' };
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

  await mergeHotwordsIntoMeeting(meetingId, recording.hotwords);
  return { message: '录音已附加到会议' };
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

  // No live-service sync without externalId

  return {
    message: '转录完成',
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
    message: '转录优化完成',
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
