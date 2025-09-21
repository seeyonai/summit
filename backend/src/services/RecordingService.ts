import { promises as fs } from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { RecordingResponse, RecordingUpdate, SpeakerSegment } from '../types';
import { getCollection, COLLECTIONS, RecordingDocument } from '../types/mongodb';
import { SegmentationService } from './SegmentationService';
import { ensureTrailingSlash, HttpError, requestJson, uploadMultipart } from '../utils/httpClient';
import type { JsonRequestOptions } from '../utils/httpClient';
import { getMeetingById as getMeetingByIdService } from './MeetingService';
import { getFilesBaseDir, makeRelativeToBase, resolveWithinBase } from '../utils/filePaths';

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

const LIVE_SERVICE_URL = process.env.LIVE_SERVICE_URL || '';
const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL
  || process.env.TRANSCRIBE_SERVICE_URL
  || 'http://localhost:2594';

// Module-level singletons and constants
const RECORDINGS_DIR = getFilesBaseDir();
const LIVE_SERVICE_BASE = ensureTrailingSlash(LIVE_SERVICE_URL);
const TRANSCRIPTION_SERVICE_BASE = ensureTrailingSlash(TRANSCRIPTION_SERVICE_URL);
const segmentationService = new SegmentationService();

function getMimeType(filename: string): string {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case '.wav':
      return 'audio/wav';
    case '.mp3':
      return 'audio/mpeg';
    case '.flac':
      return 'audio/flac';
    case '.m4a':
      return 'audio/m4a';
    default:
      return 'application/octet-stream';
  }
}

// Shared helpers
function recordingsCollection() {
  return getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
}

async function toRecordingResponse(document: RecordingDocument, options: { includeMeeting?: boolean } = {}): Promise<RecordingResponse> {
  const baseResponse: RecordingResponse = {
    _id: document._id.toString(),
    meetingId: document.meetingId ? document.meetingId.toHexString() : undefined,
    filePath: document.filePath,
    filename: document.filename,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt ? document.updatedAt.toISOString() : undefined,
    duration: document.duration,
    fileSize: document.fileSize,
    transcription: document.transcription,
    verbatimTranscript: document.verbatimTranscript,
    speakerSegments: document.speakerSegments || undefined,
    timeStampedNotes: document.timeStampedNotes || undefined,
    alignmentItems: document.alignmentItems,
    numSpeakers: document.numSpeakers,
    sampleRate: document.sampleRate,
    channels: document.channels,
    format: document.format,
    externalId: document.externalId,
    source: document.source,
    organizedSpeeches: document.organizedSpeeches,
  };

  const { includeMeeting = false } = options;
  if (includeMeeting && document.meetingId) {
    const meetingId = document.meetingId.toHexString();
    const meeting = await getMeetingByIdService(meetingId, { includeRecordings: false });
    if (meeting) {
      return {
        ...baseResponse,
        meeting: {
          _id: meeting._id.toString(),
          title: meeting.title,
          status: meeting.status,
          createdAt: meeting.createdAt.toISOString(),
          updatedAt: meeting.updatedAt ? meeting.updatedAt.toISOString() : undefined,
          scheduledStart: meeting.scheduledStart instanceof Date ? meeting.scheduledStart.toISOString() : undefined,
          summary: meeting.summary,
          participants: meeting.participants,
        },
      };
    }
  }

  return baseResponse;
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
    throw new Error('Recording not found');
  }

  return document;
}

async function resolveAbsoluteFilePath(document: RecordingDocument): Promise<string> {
  const candidate = document.filePath || document.filename;
  const relative = makeRelativeToBase(RECORDINGS_DIR, candidate);
  const normalized = path.normalize(relative).replace(/^(\.\/*)+/, '').replace(/^[\\/]+/, '');
  const absolutePath = resolveWithinBase(RECORDINGS_DIR, normalized);
  await fs.access(absolutePath);
  return absolutePath;
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

function polishText(text: string): string {
  const trimmed = text.trim();
  const singleSpaced = trimmed.replace(/\s+/g, ' ');
  return singleSpaced.charAt(0).toUpperCase() + singleSpaced.slice(1);
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
  const responses = await Promise.all(documents.map((doc) => toRecordingResponse(doc, { includeMeeting: true })));
  return responses;
}

export async function getRecordingsByMeetingId(meetingId: string): Promise<RecordingResponse[]> {
  const collection = recordingsCollection();
  const documents = await collection
    .find({ meetingId: new ObjectId(meetingId) })
    .sort({ createdAt: -1 })
    .toArray();
  const responses = await Promise.all(documents.map((doc) => toRecordingResponse(doc, { includeMeeting: true })));
  return responses;
}

export async function getRecordingById(recordingId: string): Promise<RecordingResponse> {
  const document = await findRecording(recordingId);

  if (!document) {
    throw new Error('Recording not found');
  }

  return await toRecordingResponse(document, { includeMeeting: true });
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
  };

  const collection = recordingsCollection();
  const insertResult = await collection.insertOne(document as any);
  const inserted = await collection.findOne({ _id: insertResult.insertedId });

  if (!inserted) {
    throw new Error('Failed to persist recording');
  }

  return await toRecordingResponse(inserted);
}

export async function startRecording(): Promise<{ id: string; filename: string; filePath: string; message: string }> {
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
  };

  const collection = recordingsCollection();
  const insertResult = await collection.insertOne(document as any);
  const inserted = await collection.findOne({ _id: insertResult.insertedId });

  if (!inserted) {
    throw new Error('Failed to persist recording');
  }

  return {
    id: inserted._id.toHexString(),
    filename: inserted.filename,
    filePath: inserted.filePath,
    message: remoteResponse.message || '录音已开始',
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
    return { message: '未应用任何更改' };
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

  return { message: '录音更新成功' };
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

  return { message: '录音删除成功' };
}

export async function addRecordingToMeeting(meetingId: string, recordingId: string): Promise<{ message: string }> {
  await findRecordingOrThrow(recordingId);
  const collection = recordingsCollection();
  await collection.updateOne({ _id: new ObjectId(recordingId) }, { $set: { meetingId: new ObjectId(meetingId) } });
  return { message: '录音绑定成功' };
}

export async function transcribeRecording(recordingId: string, hotword?: string): Promise<{ message: string; transcription: string }> {
  const document = await findRecordingOrThrow(recordingId);
  const absolutePath = await resolveAbsoluteFilePath(document);
  console.log('Transcribing recording:', absolutePath);
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
    message: '转录完成成功',
    transcription: transcriptionResponse.text,
  };
}

export async function segmentRecording(recordingId: string, oracleNumSpeakers?: number): Promise<{ message: string; segments: SpeakerSegment[] }> {
  const document = await findRecordingOrThrow(recordingId);
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
    throw new Error('No transcription available to polish');
  }

  const polished = polishText(sourceText);

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
    message: '转录优化成功',
    polishedTranscription: polished,
  };
}

export const recordingService = {
  getAllRecordings,
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
