import { promises as fs } from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import path from 'path';
import { ObjectId, OptionalUnlessRequiredId } from 'mongodb';
import { RecordingResponse, RecordingUpdate, SpeakerSegment, Meeting } from '../types';
import { getCollection } from '../config/database';
import { COLLECTIONS, RecordingDocument, MeetingDocument } from '../types/documents';
import { recordingDocumentToResponse, meetingDocumentToMeeting } from '../utils/mongoMappers';
import { SegmentationService } from './SegmentationService';
import { ensureTrailingSlash, uploadMultipart } from '../utils/httpClient';
import { getFilesBaseDir, makeRelativeToBase } from '../utils/filePaths';
import { badRequest, internal, notFound } from '../utils/errors';
import { getMimeType, normalizeTranscriptText, findRecordingFilePath, findRecordingWorkingFilePath } from '../utils/recordingHelpers';
import { debug } from '../utils/logger';
import { normalizeHotwords } from '../utils/hotwordUtils';
import { mergeHotwordsIntoMeeting } from './meetingHotwordHelpers';
import { decryptFileToTempPath, readDecryptedFile } from '../utils/audioEncryption';

interface TranscriptionServiceResponse {
  text: string;
  processingTime: number;
  audioDuration?: number;
  fileSize?: number;
}

const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL || process.env.TRANSCRIBE_SERVICE_URL || 'http://localhost:2594';
const DEFAULT_TRANSCRIPTION_CHUNK_SECONDS = 300;
const DEFAULT_TRANSCRIPTION_CHUNK_OVERLAP_SECONDS = 1;

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeNumber(value: string | undefined, fallback: number): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeTranscriptChunkSettings(): { chunkSeconds: number; overlapSeconds: number } {
  const configuredChunkSeconds = parsePositiveNumber(process.env.TRANSCRIBE_CHUNK_SECONDS, DEFAULT_TRANSCRIPTION_CHUNK_SECONDS);
  const configuredOverlapSeconds = parseNonNegativeNumber(
    process.env.TRANSCRIBE_CHUNK_OVERLAP_SECONDS,
    DEFAULT_TRANSCRIPTION_CHUNK_OVERLAP_SECONDS,
  );
  const chunkSeconds = Math.max(60, Math.min(configuredChunkSeconds, DEFAULT_TRANSCRIPTION_CHUNK_SECONDS));
  const maxOverlap = Math.max(0, chunkSeconds - 1);
  const overlapSeconds = Math.max(0, Math.min(configuredOverlapSeconds, maxOverlap));

  return {
    chunkSeconds,
    overlapSeconds,
  };
}

interface SpawnResult {
  stdout: string;
  stderr: string;
}

interface TranscriptChunk {
  index: number;
  startTimeSeconds: number;
  durationSeconds: number;
  filePath: string;
}

// Module-level singletons and constants
const RECORDINGS_DIR = getFilesBaseDir();
export const TRANSCRIPTION_SERVICE_BASE = ensureTrailingSlash(TRANSCRIPTION_SERVICE_URL);
const segmentationService = new SegmentationService();

const MEETING_LOOKUP_FIELDS: Array<keyof Meeting> = ['title', 'status', 'createdAt', 'updatedAt', 'scheduledStart', 'summary'];

// Shared helpers
function recordingsCollection() {
  return getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
}

async function buildRecordingResponse(document: RecordingDocument, meetingFields?: Array<keyof Meeting>): Promise<RecordingResponse> {
  const response = recordingDocumentToResponse(document);

  if (!meetingFields?.length || !document.meetingId) {
    return response;
  }

  try {
    const meetingDoc = await getCollection<MeetingDocument>(COLLECTIONS.MEETINGS).findOne({ _id: document.meetingId });

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
    const byObjectId = await collection.findOne({
      _id: new ObjectId(recordingId),
    });
    if (byObjectId) {
      return byObjectId;
    }
  }

  return null;
}

async function findRecordingOrThrow(recordingId: string): Promise<RecordingDocument> {
  const document = await findRecording(recordingId);

  if (!document) {
    throw notFound('未找到录音', 'recording.not_found');
  }

  return document;
}

async function resolveAbsoluteFilePath(document: RecordingDocument): Promise<string> {
  const absolutePath = await findRecordingFilePath(RECORDINGS_DIR, document._id.toString(), document.format);
  if (!absolutePath) {
    throw notFound('未找到录音文件', 'recording.file_missing');
  }
  return absolutePath;
}

async function deleteRecordingFile(document: RecordingDocument): Promise<void> {
  const id = document._id.toString();
  const primaryExt = (document.format || '').toString().trim().toLowerCase() || 'wav';
  const exts = Array.from(new Set([primaryExt, 'wav']));

  const candidates: string[] = [];
  exts.forEach((ext) => {
    candidates.push(`${id}.${ext}`);
    candidates.push(`${id}.encrypted.${ext}`);
  });

  await Promise.allSettled(
    candidates.map(async (rel) => {
      const p = path.join(RECORDINGS_DIR, rel);
      try {
        await fs.unlink(p);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    })
  );
}

function buildTranscriptionUrl(pathname: string): string {
  return new URL(pathname, TRANSCRIPTION_SERVICE_BASE).toString();
}

async function runCommand(command: string, args: string[]): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const processArgs = args.map((arg) => arg);
    const child = spawn(command, processArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function detectChineseText(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}

type MergeToken = {
  value: string;
  start: number;
  end: number;
};

function tokenizeForMerge(text: string, locale: string): MergeToken[] {
  if (!text) {
    return [];
  }

  if (typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === 'undefined') {
    return Array.from(text).reduce<MergeToken[]>((tokens, char, index) => {
      if (char.trim().length === 0) {
        return tokens;
      }

      return [...tokens, { value: char, start: index, end: index + 1 }];
    }, []);
  }

  type WordSegment = { segment: string; index: number };
  const segmenter = new (Intl as unknown as {
    Segmenter: new (locale: string, options: { granularity: 'word' }) => { segment(input: string): Iterable<WordSegment> };
  }).Segmenter(
    locale,
    { granularity: 'word' },
  );
  const segments = segmenter.segment(text) as Iterable<WordSegment>;
  const tokens = Array.from(segments, (segment) => ({
    value: segment.segment,
    start: segment.index,
    end: segment.index + segment.segment.length,
  }));
  const filteredTokens = tokens.filter((token) => token.value.trim().length > 0);

  return filteredTokens.length > 0 ? filteredTokens : Array.from(text).reduce<MergeToken[]>((tokens, char, index) => {
    if (char.trim().length === 0) {
      return tokens;
    }
    return [...tokens, { value: char, start: index, end: index + 1 }];
  }, []);
}

function findOverlapTokenCount(prefixTokens: MergeToken[], suffixTokens: MergeToken[], maxLookBack: number): number {
  const max = Math.min(prefixTokens.length, suffixTokens.length, maxLookBack);

  for (let len = max; len > 0; len -= 1) {
    let matched = true;

    for (let i = 0; i < len; i += 1) {
      if (prefixTokens[prefixTokens.length - len + i].value !== suffixTokens[i].value) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return len;
    }
  }

  return 0;
}

function mergeChunkTranscripts(chunkTranscripts: string[]): string {
  if (chunkTranscripts.length === 0) {
    return '';
  }

  const fullText = chunkTranscripts.join('');
  const hasChinese = detectChineseText(fullText);
  const locale = hasChinese ? 'zh-CN' : 'en-US';
  const maxLookBack = 120;

  let mergedText = chunkTranscripts[0] || '';

  for (let i = 1; i < chunkTranscripts.length; i += 1) {
    const chunkText = chunkTranscripts[i] || '';
    const mergedTokens = tokenizeForMerge(mergedText, locale);
    const chunkTokens = tokenizeForMerge(chunkText, locale);
    const overlap = findOverlapTokenCount(mergedTokens, chunkTokens, maxLookBack);

    if (chunkTokens.length === 0) {
      continue;
    }

    if (overlap >= chunkTokens.length) {
      continue;
    }

    const overlapEnd = chunkTokens[overlap]?.start;
    if (overlapEnd === undefined) {
      mergedText += chunkText;
      continue;
    }

    mergedText += chunkText.slice(overlapEnd);
  }

  return mergedText;
}

async function probeAudioDurationSeconds(filePath: string): Promise<number | null> {
  const result = await runCommand('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', filePath]);
  const payload = JSON.parse(result.stdout || '{}');
  const durationValue = payload?.format?.duration;
  const duration = Number(durationValue);

  if (Number.isFinite(duration) && duration > 0) {
    return duration;
  }

  return null;
}

function buildChunkFilename(chunkDir: string, index: number): string {
  return path.join(chunkDir, `chunk-${String(index).padStart(4, '0')}.wav`);
}

async function splitAudioIntoChunks(sourcePath: string, chunkDir: string, chunkSeconds: number, overlapSeconds: number): Promise<TranscriptChunk[]> {
  const audioDuration = await probeAudioDurationSeconds(sourcePath);
  if (!audioDuration || audioDuration <= chunkSeconds) {
    return [];
  }

  const chunks: TranscriptChunk[] = [];

  const chunkWindowSeconds = chunkSeconds + overlapSeconds;
  const stepSeconds = chunkSeconds;

  for (let startTimeSeconds = 0, index = 0; startTimeSeconds < audioDuration; index += 1, startTimeSeconds += stepSeconds) {
    const remainingSeconds = Math.max(0, audioDuration - startTimeSeconds);
    if (remainingSeconds <= 0) {
      break;
    }

    const durationSeconds = Math.min(chunkWindowSeconds, remainingSeconds);
    const outputPath = buildChunkFilename(chunkDir, index);

    await runCommand('ffmpeg', [
      '-y',
      '-ss', String(startTimeSeconds),
      '-i', sourcePath,
      '-t', String(durationSeconds),
      '-c:a', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      outputPath,
    ]);

    chunks.push({
      index,
      startTimeSeconds,
      durationSeconds,
      filePath: outputPath,
    });
  }

  return chunks;
}

async function transcribeChunk(chunk: TranscriptChunk, hotword?: string): Promise<string> {
  const filename = path.basename(chunk.filePath);
  const chunkBuffer = await fs.readFile(chunk.filePath);
  const formData: Record<string, string> = {};

  if (hotword && hotword.trim().length > 0) {
    formData.hotword = hotword.trim();
  }

  const transcriptionResponse = await uploadMultipart<TranscriptionServiceResponse>(
    buildTranscriptionUrl('/api/upload-transcribe'),
    {
      fieldName: 'file',
      filename,
      contentType: getMimeType(filename),
      buffer: chunkBuffer,
    },
    Object.keys(formData).length > 0 ? formData : undefined,
  );

  return transcriptionResponse.text;
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

export async function getRecordingsForUser(userId: string, includeMeeting: boolean = true, limit?: number | 'all'): Promise<RecordingResponse[]> {
  const meetingsCol = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
  const uid = new ObjectId(userId);
  const accessibleMeetingIds = await meetingsCol
    .find({ $or: [{ ownerId: uid }, { members: { $elemMatch: { $eq: uid } } }] }, { projection: { _id: 1 } })
    .toArray();
  const ids = accessibleMeetingIds.map((m) => m._id);
  const collection = recordingsCollection();
  const query: Record<string, unknown> = { $or: [{ ownerId: uid }] } as Record<string, unknown>;
  if (ids.length > 0) {
    (query.$or as unknown[]).push({ meetingId: { $in: ids } });
  }
  const cursor = collection.find(query).sort({ createdAt: -1 });

  if (limit !== 'all') {
    cursor.limit(typeof limit === 'number' ? limit : 100);
  }

  const documents = await cursor.toArray();
  const meetingFields = includeMeeting ? MEETING_LOOKUP_FIELDS : undefined;
  return Promise.all(documents.map((doc) => buildRecordingResponse(doc, meetingFields)));
}

export async function getRecordingsByMeetingId(meetingId: string, includeMeeting: boolean = true): Promise<RecordingResponse[]> {
  if (!ObjectId.isValid(meetingId)) {
    throw badRequest('无效的会议 ID', 'meeting.invalid_id');
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
    throw notFound('未找到录音', 'recording.not_found');
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
    ownerId: recordingData.ownerId && ObjectId.isValid(recordingData.ownerId) ? new ObjectId(recordingData.ownerId) : undefined,
    meetingId: recordingData.meetingId && ObjectId.isValid(recordingData.meetingId) ? new ObjectId(recordingData.meetingId) : undefined,
    hotwords: normalizedHotwords && normalizedHotwords.length > 0 ? normalizedHotwords : undefined,
  };

  const collection = recordingsCollection();
  const insertResult = await collection.insertOne(document);
  const inserted = await collection.findOne({ _id: insertResult.insertedId });

  if (!inserted) {
    throw internal('保存录音失败', 'recording.persist_failed');
  }

  if (inserted.meetingId) {
    await mergeHotwordsIntoMeeting(inserted.meetingId, inserted.hotwords);
  }

  return recordingDocumentToResponse(inserted);
}

export async function startRecording(ownerId: string, meetingId?: string): Promise<{ id: string; message: string }> {
  if (!ownerId || !ObjectId.isValid(ownerId)) {
    throw badRequest('所有者 ID 为必填项且必须是有效的 ObjectId', 'recording.missing_owner_id');
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
    throw internal('保存录音失败', 'recording.persist_failed');
  }

  if (inserted.meetingId) {
    await mergeHotwordsIntoMeeting(inserted.meetingId, inserted.hotwords);
  }

  return {
    id: inserted._id.toHexString(),
    message: '录音已开始',
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

  if (Array.isArray((updateData as { transcriptionChunks?: string[] }).transcriptionChunks)) {
    const chunks = (updateData as { transcriptionChunks?: string[] }).transcriptionChunks;
    if (chunks && chunks.every((value) => typeof value === 'string')) {
      updates.transcriptionChunks = chunks;
      remoteUpdates.transcriptionChunks = updates.transcriptionChunks;
    }
  }

  if (typeof updateData.verbatimTranscript === 'string') {
    updates.verbatimTranscript = updateData.verbatimTranscript;
    remoteUpdates.verbatimTranscript = updateData.verbatimTranscript;
  }

  if (typeof (updateData as unknown as { label?: string }).label === 'string') {
    const raw = (updateData as unknown as { label?: string }).label as string;
    const trimmed = raw.trim();
    updates.label = trimmed.length > 0 ? trimmed : undefined;
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

  if (Object.prototype.hasOwnProperty.call(updateData, 'alignmentStatus')) {
    const status = (updateData as { alignmentStatus?: string }).alignmentStatus;
    if (status === 'idle' || status === 'processing' || status === 'completed' || status === 'failed') {
      updates.alignmentStatus = status;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'alignmentProgressSeconds')) {
    const value = (updateData as { alignmentProgressSeconds?: unknown }).alignmentProgressSeconds;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      updates.alignmentProgressSeconds = value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'alignmentProgressTotalSeconds')) {
    const value = (updateData as { alignmentProgressTotalSeconds?: unknown }).alignmentProgressTotalSeconds;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      updates.alignmentProgressTotalSeconds = value;
    }
  }

  if (Array.isArray(updateData.speakerSegments)) {
    updates.speakerSegments = updateData.speakerSegments.length > 0 ? updateData.speakerSegments : undefined;
    remoteUpdates.speakerSegments = updates.speakerSegments;
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'numSpeakers')) {
    updates.numSpeakers = typeof updateData.numSpeakers === 'number' && updateData.numSpeakers > 0 ? updateData.numSpeakers : undefined;
    remoteUpdates.numSpeakers = updates.numSpeakers;
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
    throw badRequest('无效的会议 ID', 'meeting.invalid_id');
  }

  const recordingsCol = recordingsCollection();
  const meetingsCollection = getCollection<MeetingDocument>(COLLECTIONS.MEETINGS);
  
  // Get current meeting to find the next index
  const meeting = await meetingsCollection.findOne({ _id: new ObjectId(meetingId) });
  if (!meeting) {
    throw badRequest('会议不存在', 'meeting.not_found');
  }
  
  const nextIndex = Array.isArray(meeting.recordingOrder) 
    ? Math.max(...meeting.recordingOrder.map(item => item.index), -1) + 1 
    : 0;
  
  // Update recording with meetingId
  await recordingsCol.updateOne(
    { _id: recording._id }, 
    { $set: { meetingId: new ObjectId(meetingId) } }
  );
  
  // Append to recordingOrder
  await meetingsCollection.updateOne(
    { _id: new ObjectId(meetingId) },
    { 
      $push: { 
        recordingOrder: {
          recordingId: recording._id,
          index: nextIndex,
          enabled: true
        } as any
      }
    }
  );

  await mergeHotwordsIntoMeeting(meetingId, recording.hotwords);
  return { message: '录音已附加到会议' };
}

export async function transcribeRecording(recordingId: string, hotword?: string): Promise<{ message: string; transcription: string }> {
  const document = await findRecordingOrThrow(recordingId);
  const collection = recordingsCollection();
  const workingPath =
    (await findRecordingWorkingFilePath(RECORDINGS_DIR, document._id.toString(), document.format)) || (await resolveAbsoluteFilePath(document));
  debug('Transcribing recording:', workingPath);
  let fileToProcessPath = workingPath;
  let cleanupTempFile: (() => Promise<void>) | null = null;
  let cleanupChunks = async (): Promise<void> => undefined;

  try {
    const { tempPath, cleanup } = await decryptFileToTempPath(workingPath);
    fileToProcessPath = tempPath;
    cleanupTempFile = cleanup;
  } catch (error) {
    throw internal(`解密录音失败: ${(error as Error).message}`, 'transcription.decryption_failed');
  }

  const configured = normalizeTranscriptChunkSettings();
  let transcriptionResponse: TranscriptionServiceResponse = {
    text: '',
    processingTime: 0,
  };
  let transcriptionChunks: string[] = [];
  let progressTotalSeconds: number | undefined;
  let progressProcessedSeconds = 0;

  try {
    let useChunking = false;
    const configuredChunkSeconds = configured.chunkSeconds;
    const overlapSeconds = configured.overlapSeconds;
    const sourceDuration = typeof document.duration === 'number' && Number.isFinite(document.duration) && document.duration > 0
      ? document.duration
      : await probeAudioDurationSeconds(fileToProcessPath);

    if (typeof sourceDuration === 'number' && Number.isFinite(sourceDuration) && sourceDuration > 0) {
      progressTotalSeconds = sourceDuration;
    }

    await collection.updateOne(
      { _id: document._id },
      {
        $set: {
          transcriptionStatus: 'processing',
          transcriptionProgressSeconds: 0,
          transcriptionProgressTotalSeconds: progressTotalSeconds,
          updatedAt: new Date(),
        },
      },
    );

    if (
      typeof sourceDuration === 'number'
      && Number.isFinite(sourceDuration)
      && sourceDuration > configuredChunkSeconds
    ) {
      useChunking = true;
    }

    if (!useChunking) {
      const fileBuffer = await readDecryptedFile(fileToProcessPath);
      const filename = path.basename(fileToProcessPath);
      const formData: Record<string, string> = {};

      if (hotword && typeof hotword === 'string' && hotword.trim().length > 0) {
        formData.hotword = hotword.trim();
      }

      transcriptionResponse = await uploadMultipart<TranscriptionServiceResponse>(
        buildTranscriptionUrl('/api/upload-transcribe'),
        {
          fieldName: 'file',
          filename,
          contentType: getMimeType(filename),
          buffer: fileBuffer,
        },
        Object.keys(formData).length > 0 ? formData : undefined
      );

      transcriptionChunks = [];
      if (typeof progressTotalSeconds === 'number' && Number.isFinite(progressTotalSeconds) && progressTotalSeconds > 0) {
        progressProcessedSeconds = progressTotalSeconds;
      }
    } else {
      const chunkDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-transcription-chunks-'));
      cleanupChunks = async () => fs.rm(chunkDir, { recursive: true, force: true }).catch(() => undefined);

      try {
        const generated = await splitAudioIntoChunks(fileToProcessPath, chunkDir, configuredChunkSeconds, overlapSeconds);
        if (generated.length === 0) {
          throw badRequest('音频切分失败，请检查音频文件格式', 'transcription.chunking_failed');
        }

        const chunks: string[] = [];

        for (const chunk of generated) {
          const chunkText = await transcribeChunk(chunk, hotword);
          chunks.push(chunkText);

          if (typeof progressTotalSeconds === 'number' && Number.isFinite(progressTotalSeconds) && progressTotalSeconds > 0) {
            const effectiveChunkSeconds = Math.min(configuredChunkSeconds, chunk.durationSeconds);
            progressProcessedSeconds = Math.min(progressTotalSeconds, chunk.startTimeSeconds + effectiveChunkSeconds);
          } else {
            progressProcessedSeconds += chunk.durationSeconds;
          }

          await collection.updateOne(
            { _id: document._id },
            {
              $set: {
                transcriptionStatus: 'processing',
                transcriptionProgressSeconds: progressProcessedSeconds,
                transcriptionProgressTotalSeconds: progressTotalSeconds,
                updatedAt: new Date(),
              },
            },
          );
        }

        transcriptionChunks = chunks;
      } finally {
        await cleanupChunks();
      }

      if (transcriptionChunks.length === 0) {
        transcriptionResponse.text = '';
      } else {
        transcriptionResponse.text = mergeChunkTranscripts(transcriptionChunks);
      }
    }
  } catch (error) {
    await collection.updateOne(
      { _id: document._id },
      {
        $set: {
          transcriptionStatus: 'failed',
          transcriptionProgressSeconds: progressProcessedSeconds,
          transcriptionProgressTotalSeconds: progressTotalSeconds,
          updatedAt: new Date(),
        },
      },
    );
    throw error;
  } finally {
    if (cleanupTempFile) {
      await cleanupTempFile().catch(() => undefined);
    }
  }

  const updates: Partial<RecordingDocument> = {
    transcription: transcriptionResponse.text,
    transcriptionChunks,
    updatedAt: new Date(),
  };

  if (typeof transcriptionResponse.audioDuration === 'number') {
    updates.duration = transcriptionResponse.audioDuration;
  }

  if (typeof transcriptionResponse.fileSize === 'number') {
    updates.fileSize = transcriptionResponse.fileSize;
  }

  updates.transcriptionStatus = 'completed';
  updates.transcriptionProgressSeconds =
    typeof progressTotalSeconds === 'number' && Number.isFinite(progressTotalSeconds) && progressTotalSeconds > 0
      ? progressTotalSeconds
      : progressProcessedSeconds;
  updates.transcriptionProgressTotalSeconds = progressTotalSeconds;

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
  const workingPath =
    (await findRecordingWorkingFilePath(RECORDINGS_DIR, document._id.toString(), document.format)) || (await resolveAbsoluteFilePath(document));
  const relativePath = makeRelativeToBase(RECORDINGS_DIR, workingPath);

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
    throw badRequest('没有可供优化的转录文本', 'recording.transcription_missing');
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
