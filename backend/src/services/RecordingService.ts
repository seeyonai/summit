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

class RecordingServiceImpl {
  private recordingsDir: string;

  private liveServiceBase: string;

  private transcriptionServiceBase: string;

  private segmentationService: SegmentationService;

  constructor() {
    this.recordingsDir = getFilesBaseDir();
    this.liveServiceBase = ensureTrailingSlash(LIVE_SERVICE_URL);
    this.transcriptionServiceBase = ensureTrailingSlash(TRANSCRIPTION_SERVICE_URL);
    this.segmentationService = new SegmentationService();
  }

  async getAllRecordings(): Promise<RecordingResponse[]> {
    const collection = this.getCollection();
    const documents = await collection.find({}).sort({ createdAt: 1 }).toArray();
    const responses = await Promise.all(documents.map((doc) => this.toResponse(doc, { includeMeeting: true })));
    return responses;
  }

  async getRecordingsByMeetingId(meetingId: string): Promise<RecordingResponse[]> {
    const collection = this.getCollection();
    const documents = await collection.find({meetingId: new ObjectId(meetingId)}).sort({ createdAt: -1 }).toArray();
    const responses = await Promise.all(documents.map((doc) => this.toResponse(doc, { includeMeeting: true })));
    return responses;
  }

  async getRecordingById(recordingId: string): Promise<RecordingResponse> {
    const document = await this.findRecording(recordingId);

    if (!document) {
      throw new Error('Recording not found');
    }

    return await this.toResponse(document, { includeMeeting: true });
  }

  async createRecording(recordingData: {
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

    const collection = this.getCollection();
    const insertResult = await collection.insertOne(document as any);
    const inserted = await collection.findOne({ _id: insertResult.insertedId });

    if (!inserted) {
      throw new Error('Failed to persist recording');
    }

    return await this.toResponse(inserted);
  }

  async startRecording(): Promise<{ id: string; filename: string; filePath: string; message: string }> {
    const remoteResponse = await this.callLiveService<LiveRecordingStartResponse>('/api/recordings/start', {
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

    const collection = this.getCollection();
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

  async updateRecording(recordingId: string, updateData: RecordingUpdate): Promise<{ message: string }> {
    const document = await this.findRecordingOrThrow(recordingId);

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

    if (Object.keys(updates).length === 0) {
      return { message: '未应用任何更改' };
    }

    if (document.externalId) {
      await this.callLiveService(`/api/recordings/${document.externalId}`, {
        method: 'PUT',
        body: remoteUpdates,
        expectedStatus: [200],
      });
    }

    updates.updatedAt = new Date();

    const collection = this.getCollection();
    await collection.updateOne({ _id: document._id }, { $set: updates });

    return { message: '录音更新成功' };
  }

  async deleteRecording(recordingId: string): Promise<{ message: string }> {
    const document = await this.findRecordingOrThrow(recordingId);
    const collection = this.getCollection();

    if (document.externalId) {
      try {
        await this.callLiveService(`/api/recordings/${document.externalId}`, {
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
    await this.deleteRecordingFile(document).catch(() => undefined);

    return { message: '录音删除成功' };
  }

  async transcribeRecording(recordingId: string, hotword?: string): Promise<{ message: string; transcription: string }> {
    const document = await this.findRecordingOrThrow(recordingId);
    const absolutePath = await this.resolveAbsoluteFilePath(document);
    console.log('Transcribing recording:', absolutePath);
    const fileBuffer = await fs.readFile(absolutePath);
    const filename = path.basename(absolutePath);

    const formData: Record<string, string> = {};

    // Add hotword if provided
    if (hotword && typeof hotword === 'string' && hotword.trim().length > 0) {
      formData.hotword = hotword.trim();
    }

    const transcriptionResponse = await uploadMultipart<TranscriptionServiceResponse>(
      this.buildTranscriptionUrl('/api/upload-transcribe'),
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

    const collection = this.getCollection();
    await collection.updateOne({ _id: document._id }, { $set: updates });

    if (document.externalId) {
      await this.callLiveService(`/api/recordings/${document.externalId}`, {
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

  async segmentRecording(recordingId: string, oracleNumSpeakers?: number): Promise<{ message: string; segments: SpeakerSegment[] }> {
    const document = await this.findRecordingOrThrow(recordingId);
    const relativePath = this.getRelativeFilePath(document);

    const segmentationResult = await this.segmentationService.analyzeSegmentation({
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

    const collection = this.getCollection();
    await collection.updateOne({ _id: document._id }, { $set: updates });

    return {
      message: segmentationResult.message,
      segments,
    };
  }

  async polishTranscription(recordingId: string): Promise<{ message: string; polishedTranscription: string }> {
    const document = await this.findRecordingOrThrow(recordingId);
    const sourceText = document.transcription || document.verbatimTranscript;

    if (!sourceText) {
      throw new Error('No transcription available to polish');
    }

    const polished = this.polishText(sourceText);

    const collection = this.getCollection();
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

  private getCollection() {
    return getCollection<RecordingDocument>(COLLECTIONS.RECORDINGS);
  }

  private async toResponse(document: RecordingDocument, options: { includeMeeting?: boolean } = {}): Promise<RecordingResponse> {
    // Get the basic response structure
    const baseResponse: RecordingResponse = {
      _id: document._id.toString(),
      filePath: document.filePath,
      filename: document.filename,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt ? document.updatedAt.toISOString() : undefined,
      duration: document.duration,
      fileSize: document.fileSize,
      transcription: document.transcription,
      verbatimTranscript: document.verbatimTranscript,
      speakerSegments: document.speakerSegments,
      numSpeakers: document.numSpeakers,
      sampleRate: document.sampleRate,
      channels: document.channels,
      format: document.format,
      externalId: document.externalId,
      source: document.source,
    };

    // If requested, and the recording has a meetingId, include a lightweight meeting summary
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
            scheduledStart: meeting.scheduledStart ? meeting.scheduledStart.toISOString() : undefined,
            summary: meeting.summary,
            participants: meeting.participants,
          },
        };
      }
    }

    // Return base response if no meetingId or meeting not found
    return baseResponse;
  }

  private async findRecording(recordingId: string): Promise<RecordingDocument | null> {
    const collection = this.getCollection();

    if (ObjectId.isValid(recordingId)) {
      const byObjectId = await collection.findOne({ _id: new ObjectId(recordingId) });
      if (byObjectId) {
        return byObjectId;
      }
    }

    return collection.findOne({ externalId: recordingId });
  }

  private async findRecordingOrThrow(recordingId: string): Promise<RecordingDocument> {
    const document = await this.findRecording(recordingId);

    if (!document) {
      throw new Error('Recording not found');
    }

    return document;
  }

  private async resolveAbsoluteFilePath(document: RecordingDocument): Promise<string> {
    const candidate = document.filePath || document.filename;
    const relative = makeRelativeToBase(this.recordingsDir, candidate);
    const normalized = path.normalize(relative).replace(/^(\.\/*)+/, '').replace(/^[\\/]+/, '');
    const absolutePath = resolveWithinBase(this.recordingsDir, normalized);
    await fs.access(absolutePath);
    return absolutePath;
  }

  private getRelativeFilePath(document: RecordingDocument): string {
    return makeRelativeToBase(this.recordingsDir, document.filePath || document.filename);
  }

  private async deleteRecordingFile(document: RecordingDocument): Promise<void> {
    try {
      const absolutePath = await this.resolveAbsoluteFilePath(document);
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private polishText(text: string): string {
    const trimmed = text.trim();
    const singleSpaced = trimmed.replace(/\s+/g, ' ');
    return singleSpaced.charAt(0).toUpperCase() + singleSpaced.slice(1);
  }

  private buildLiveServiceUrl(pathname: string): string {
    return new URL(pathname, this.liveServiceBase).toString();
  }

  private buildTranscriptionUrl(pathname: string): string {
    return new URL(pathname, this.transcriptionServiceBase).toString();
  }

  private async callLiveService<T>(pathname: string, options: JsonRequestOptions): Promise<T> {
    return requestJson<T>(this.buildLiveServiceUrl(pathname), options);
  }
}

const recordingServiceImpl = new RecordingServiceImpl();

export async function getAllRecordings(): Promise<RecordingResponse[]> {
  return await recordingServiceImpl.getAllRecordings();
}

export async function getRecordingsByMeetingId(meetingId: string) {
  return await recordingServiceImpl.getRecordingsByMeetingId(meetingId);
}

export async function getRecordingById(recordingId: string): Promise<RecordingResponse> {
  return await recordingServiceImpl.getRecordingById(recordingId);
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
  return await recordingServiceImpl.createRecording(recordingData);
}

export async function startRecording(): Promise<{ id: string; filename: string; filePath: string; message: string }> {
  return recordingServiceImpl.startRecording();
}

export async function updateRecording(recordingId: string, updateData: RecordingUpdate): Promise<{ message: string }> {
  return recordingServiceImpl.updateRecording(recordingId, updateData);
}

export async function deleteRecording(recordingId: string): Promise<{ message: string }> {
  return recordingServiceImpl.deleteRecording(recordingId);
}

export async function transcribeRecording(recordingId: string, hotword?: string): Promise<{ message: string; transcription: string }> {
  return recordingServiceImpl.transcribeRecording(recordingId, hotword);
}

export async function segmentRecording(recordingId: string, oracleNumSpeakers?: number): Promise<{ message: string; segments: SpeakerSegment[] }> {
  return recordingServiceImpl.segmentRecording(recordingId, oracleNumSpeakers);
}

export async function polishTranscription(recordingId: string): Promise<{ message: string; polishedTranscription: string }> {
  return recordingServiceImpl.polishTranscription(recordingId);
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
};

export default recordingService;
