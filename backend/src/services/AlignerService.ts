import fs from 'fs';
import path from 'path';
import { ensureTrailingSlash, HttpError, httpRequest, requestJson } from '../utils/httpClient';
import { getFilesBaseDir, normalizePublicOrRelative, resolveWithinBase } from '../utils/filePaths';
import { badRequest, internal, notFound } from '../utils/errors';

interface ApiModelInfo {
  model: string;
  model_revision: string;
  task: string;
  available: boolean;
  description: string;
}

interface ApiAlignmentItem {
  key?: string;
  text?: string;
  timestamp?: number[][];
}

interface ApiAlignmentResponse {
  success: boolean;
  alignments?: ApiAlignmentItem[];
  message: string;
  key?: string | null;
}

export interface AlignerModelInfo {
  model: string;
  modelRevision: string;
  task: string;
  available: boolean;
  description: string;
}

export interface AlignmentItem {
  key: string;
  text: string;
  timestamp: number[][];
}

export interface AlignmentResponse {
  success: boolean;
  alignments: AlignmentItem[];
  message: string;
  key: string | null;
}

export const ALIGNER_SERVICE_URL = process.env.ALIGNER_SERVICE_URL || 'http://localhost:2595';

export class AlignerService {
  private recordingsDir: string;

  private serviceBase: string;

  constructor() {
    this.recordingsDir = getFilesBaseDir();
    this.serviceBase = ensureTrailingSlash(ALIGNER_SERVICE_URL);
  }

  async getModelInfo(): Promise<AlignerModelInfo> {
    try {
      const data = await requestJson<ApiModelInfo>(this.buildUrl('/api/model-info'));
      return this.mapModelInfo(data);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async alignAudioWithText(options: { audioFilePath: string; text: string }): Promise<AlignmentResponse> {
    const { audioFilePath, text } = options;

    if (!audioFilePath || typeof audioFilePath !== 'string') {
      throw badRequest('audioFilePath is required', 'alignment.audio_required');
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw badRequest('text is required', 'alignment.text_required');
    }

    const normalizedPath = normalizePublicOrRelative(audioFilePath);
    const absolutePath = this.resolveAudioFilePath(normalizedPath);
    console.log('Aligning audio with text:', absolutePath);
    const audioBuffer = await fs.promises.readFile(absolutePath);
    const contentType = this.determineContentType(absolutePath);

    const targetUrl = this.buildAlignBytesUrl(text);

    try {
      const response = await this.sendAlignBytesRequest(targetUrl, audioBuffer, contentType);
      return this.mapAlignmentResponse(response);
    } catch (error) {
      this.handleApiError(error, { audioFilePath: normalizedPath });
    }
  }

  private buildUrl(pathname: string): string {
    return new URL(pathname, this.serviceBase).toString();
  }

  private buildAlignBytesUrl(text: string): string {
    const url = new URL('/api/align-bytes', this.serviceBase);
    url.searchParams.set('text', text);
    return url.toString();
  }

  private resolveAudioFilePath(relativePath: string): string {
    const absolutePath = resolveWithinBase(this.recordingsDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw notFound(`Audio file not found: ${relativePath}`, 'alignment.audio_not_found');
    }
    return absolutePath;
  }

  private mapModelInfo(data: ApiModelInfo): AlignerModelInfo {
    return {
      model: data.model,
      modelRevision: data.model_revision,
      task: data.task,
      available: data.available,
      description: data.description,
    };
  }

  private mapAlignmentResponse(data: ApiAlignmentResponse): AlignmentResponse {
    const alignments: AlignmentItem[] = Array.isArray(data.alignments)
      ? data.alignments.map((item): AlignmentItem | null => {
        const key = typeof item.key === 'string' && item.key.length > 0 ? item.key : 'unknown';
        const text = typeof item.text === 'string' ? item.text : '';
        const timestamps = Array.isArray(item.timestamp) ? this.mapTimestamps(item.timestamp) : [];
        return { key, text, timestamp: timestamps };
      }).filter((x): x is AlignmentItem => x !== null)
      : [];

    return {
      success: Boolean(data.success),
      alignments,
      message: typeof data.message === 'string' ? data.message : '',
      key: typeof data.key === 'string' ? data.key : null,
    };
  }

  private mapTimestamps(raw?: number[][]): number[][] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((pair) => Array.isArray(pair) && pair.length >= 2 ? [Number(pair[0]), Number(pair[1])] : null)
      .filter((pair): pair is number[] => Array.isArray(pair) && pair.length === 2 && pair.every((v) => Number.isFinite(v)));
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

  private async sendAlignBytesRequest(url: string, audioBuffer: Buffer, contentType: string): Promise<ApiAlignmentResponse> {
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
      throw internal('Aligner service returned empty response', 'alignment.empty_response');
    }

    try {
      return JSON.parse(response.data.toString('utf8')) as ApiAlignmentResponse;
    } catch (error) {
      throw internal(`Failed to parse alignment response: ${(error as Error).message}`, 'alignment.parse_failed');
    }
  }

  private extractErrorDetail(body: string): string | null {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.detail === 'string') return parsed.detail;
      if (parsed && typeof parsed.message === 'string') return parsed.message;
      if (parsed && typeof parsed.error === 'string') return parsed.error;
    } catch (_) {
      // ignore
    }
    const trimmed = body?.trim?.() || '';
    return trimmed.length > 0 ? trimmed : null;
  }

  private handleApiError(error: unknown, context?: { audioFilePath?: string }): never {
    if (error instanceof HttpError) {
      const detail = this.extractErrorDetail(error.body);
      if (error.status === 404) {
        throw notFound(
          detail || (context?.audioFilePath ? `Audio file not found: ${context.audioFilePath}` : 'Resource not found'),
          'alignment.audio_not_found'
        );
      }
      if (error.status === 400) {
        throw badRequest(detail || 'Invalid alignment request', 'alignment.invalid_request');
      }
      throw internal(detail || 'Aligner service error', 'alignment.service_error');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw internal('Unknown aligner service error', 'alignment.unknown_error');
  }
}

export const alignerService = new AlignerService();

export async function getAlignerModelInfo(): Promise<AlignerModelInfo> {
  return alignerService.getModelInfo();
}

export async function alignAudioWithText(audioFilePath: string, text: string): Promise<AlignmentResponse> {
  return alignerService.alignAudioWithText({ audioFilePath, text });
}

export default alignerService;

