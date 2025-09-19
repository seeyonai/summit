import fs from 'fs';
import path from 'path';
import { ensureTrailingSlash, HttpError, requestJson, uploadMultipart } from '../utils/httpClient';
import { SegmentationRequest, SegmentationResponse, SegmentationModelInfo, SpeakerSegment } from '../types';

interface ApiModelInfo {
  model: string;
  model_revision: string;
  task: string;
  available: boolean;
  description: string;
}

interface ApiSegmentationResponse {
  success: boolean;
  segments?: number[][];
  text_segments?: string[] | null;
  message: string;
  file_processed?: string | null;
}

const SEGMENTATION_SERVICE_URL = process.env.SEGMENTATION_SERVICE_URL || 'http://localhost:2593';
const VALID_EXTENSIONS = new Set(['.wav', '.mp3', '.flac', '.m4a']);

export class SegmentationService {
  private recordingsDir: string;

  private serviceBase: string;

  constructor() {
    this.recordingsDir = path.resolve(__dirname, '..', '..', '..', 'files');
    this.serviceBase = ensureTrailingSlash(SEGMENTATION_SERVICE_URL);
  }

  async getModelInfo(): Promise<SegmentationModelInfo> {
    try {
      const response = await requestJson<ApiModelInfo>(this.buildUrl('/api/model-info'));
      return this.mapModelInfo(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async analyzeSegmentation(request: SegmentationRequest): Promise<SegmentationResponse> {
    if (!request.audioFilePath) {
      throw new Error('audioFilePath is required');
    }

    const normalizedPath = this.normalizeRelativePath(request.audioFilePath);
    this.ensureAudioFileExists(normalizedPath);

    const payload: Record<string, unknown> = {
      audio_file_path: normalizedPath,
    };

    if (this.isValidOracleHint(request.oracleNumSpeakers)) {
      payload.oracle_num_speakers = request.oracleNumSpeakers;
    }

    if (typeof request.returnText === 'boolean') {
      payload.return_text = request.returnText;
    }

    try {
      const response = await requestJson<ApiSegmentationResponse>(this.buildUrl('/api/analyze'), {
        method: 'POST',
        body: payload,
        expectedStatus: [200],
      });

      return this.mapSegmentationResponse(response, normalizedPath);
    } catch (error) {
      this.handleApiError(error, { audioFilePath: normalizedPath });
    }
  }

  async uploadAndAnalyze(file: Express.Multer.File, oracleNumSpeakers?: number, returnText = false): Promise<SegmentationResponse> {
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!VALID_EXTENSIONS.has(fileExtension)) {
      throw new Error('File must be an audio file (wav, mp3, flac, m4a)');
    }

    const targetUrl = this.buildUploadUrl(oracleNumSpeakers, returnText);
    const contentType = file.mimetype || this.guessMimeType(fileExtension);

    try {
      const response = await uploadMultipart<ApiSegmentationResponse>(targetUrl, {
        fieldName: 'file',
        filename: file.originalname,
        contentType,
        buffer: file.buffer,
      });

      return this.mapSegmentationResponse(response);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  private buildUrl(pathname: string): string {
    return new URL(pathname, this.serviceBase).toString();
  }

  private buildUploadUrl(oracleNumSpeakers?: number, returnText?: boolean): string {
    const url = new URL('/api/upload', this.serviceBase);

    if (this.isValidOracleHint(oracleNumSpeakers)) {
      url.searchParams.set('oracle_num_speakers', String(oracleNumSpeakers));
    }

    if (typeof returnText === 'boolean') {
      url.searchParams.set('return_text', returnText ? 'true' : 'false');
    }

    return url.toString();
  }

  private normalizeRelativePath(input: string): string {
    const normalizedSlashes = input.replace(/\\/g, '/');

    if (normalizedSlashes.startsWith('/files/')) {
      return normalizedSlashes.substring('/files/'.length);
    }

    if (normalizedSlashes.startsWith('files/')) {
      return normalizedSlashes.substring('files/'.length);
    }

    return normalizedSlashes.replace(/^\//, '');
  }

  private ensureAudioFileExists(relativePath: string): void {
    const absolutePath = path.resolve(this.recordingsDir, relativePath);
    const relativeToRoot = path.relative(this.recordingsDir, absolutePath);

    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      throw new Error('Invalid audio file path');
    }

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Audio file not found: ${relativePath}`);
    }
  }

  private isValidOracleHint(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 1;
  }

  private mapModelInfo(data: ApiModelInfo): SegmentationModelInfo {
    return {
      model: data.model,
      modelRevision: data.model_revision,
      task: data.task,
      available: data.available,
      description: data.description,
    };
  }

  private mapSegmentationResponse(data: ApiSegmentationResponse, fallbackPath?: string): SegmentationResponse {
    return {
      success: data.success,
      segments: this.mapSegments(data.segments),
      textSegments: typeof data.text_segments === 'undefined' ? null : data.text_segments,
      message: data.message,
      fileProcessed: data.file_processed ?? fallbackPath ?? null,
    };
  }

  private mapSegments(rawSegments?: number[][]): SpeakerSegment[] {
    if (!Array.isArray(rawSegments)) {
      return [];
    }

    return rawSegments
      .map((segment) => this.mapSegmentTuple(segment))
      .filter((segment): segment is SpeakerSegment => segment !== null);
  }

  private mapSegmentTuple(segment?: number[]): SpeakerSegment | null {
    if (!Array.isArray(segment) || segment.length < 3) {
      return null;
    }

    const [start, end, speaker] = segment;
    const startTime = Number(start);
    const endTime = Number(end);
    const speakerIndex = Number(speaker);

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || !Number.isFinite(speakerIndex)) {
      return null;
    }

    return {
      startTime,
      endTime,
      speakerIndex: Math.trunc(speakerIndex),
    };
  }

  private guessMimeType(extension: string): string {
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

  private extractErrorDetail(body: string): string | null {
    try {
      const parsed = JSON.parse(body);

      if (parsed && typeof parsed.detail === 'string') {
        return parsed.detail;
      }

      if (parsed && typeof parsed.message === 'string') {
        return parsed.message;
      }

      if (parsed && typeof parsed.error === 'string') {
        return parsed.error;
      }
    } catch (_) {
      // Ignore JSON parse errors and fall back to string parsing
    }

    const trimmed = body.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private handleApiError(error: unknown, context?: { audioFilePath?: string }): never {
    if (error instanceof HttpError) {
      const detail = this.extractErrorDetail(error.body);

      if (error.status === 404) {
        throw new Error(detail || (context?.audioFilePath ? `Audio file not found: ${context.audioFilePath}` : 'Resource not found'));
      }

      if (error.status === 400) {
        throw new Error(detail || 'Invalid segmentation request');
      }

      throw new Error(detail || 'Segmentation service error');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unknown segmentation service error');
  }
}
