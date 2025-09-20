import fs from 'fs';
import path from 'path';
import { ensureTrailingSlash, HttpError, httpRequest, requestJson } from '../utils/httpClient';
import { SegmentationRequest, SegmentationResponse, SegmentationModelInfo, SpeakerSegment } from '../types';
import { getFilesBaseDir, normalizePublicOrRelative, resolveWithinBase } from '../utils/filePaths';

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
export class SegmentationService {
  private recordingsDir: string;

  private serviceBase: string;

  constructor() {
    this.recordingsDir = getFilesBaseDir();
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

    const normalizedPath = normalizePublicOrRelative(request.audioFilePath);
    const absolutePath = this.resolveAudioFilePath(normalizedPath);

    const audioBuffer = await fs.promises.readFile(absolutePath);
    const contentType = this.determineContentType(absolutePath);
    const targetUrl = this.buildAnalyzeUrl(request.oracleNumSpeakers, request.returnText);

    try {
      const response = await this.sendAnalyzeRequest(targetUrl, audioBuffer, contentType);

      return this.mapSegmentationResponse(response, normalizedPath);
    } catch (error) {
      this.handleApiError(error, { audioFilePath: normalizedPath });
    }
  }

  private buildUrl(pathname: string): string {
    return new URL(pathname, this.serviceBase).toString();
  }

  private buildAnalyzeUrl(oracleNumSpeakers?: number, returnText?: boolean): string {
    const url = new URL('/api/analyze', this.serviceBase);

    if (this.isValidOracleHint(oracleNumSpeakers)) {
      url.searchParams.set('oracle_num_speakers', String(oracleNumSpeakers));
    }

    if (typeof returnText === 'boolean') {
      url.searchParams.set('return_text', returnText ? 'true' : 'false');
    }

    return url.toString();
  }

  private resolveAudioFilePath(relativePath: string): string {
    const absolutePath = resolveWithinBase(this.recordingsDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Audio file not found: ${relativePath}`);
    }
    return absolutePath;
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

  private determineContentType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();

    switch (extension) {
      case '.wav':
        return 'audio/wav';
      case '.mp3':
        return 'audio/mpeg';
      case '.flac':
        return 'audio/flac';
      case '.m4a':
        return 'audio/x-m4a';
      default:
        return 'application/octet-stream';
    }
  }

  private async sendAnalyzeRequest(url: string, audioBuffer: Buffer, contentType: string): Promise<ApiSegmentationResponse> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': contentType,
      'Content-Length': audioBuffer.byteLength.toString(10),
    };

    const response = await httpRequest(url, {
      method: 'POST',
      headers,
      body: audioBuffer,
      expectedStatus: [200],
    });

    if (response.data.length === 0) {
      throw new Error('Segmentation service returned empty response');
    }

    try {
      return JSON.parse(response.data.toString('utf8')) as ApiSegmentationResponse;
    } catch (error) {
      throw new Error(`Failed to parse segmentation response: ${(error as Error).message}`);
    }
  }
}
