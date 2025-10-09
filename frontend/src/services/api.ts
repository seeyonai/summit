import type { Meeting, MeetingWithRecordings, Recording, SegmentationModelInfo, SegmentationRequest, SegmentationResponse, SpeakerSegment, AppCustomization, DisputedIssue, Todo } from '@/types';
import { toast } from 'sonner';

type ErrorPayload = {
  message: string;
  code?: string;
  details?: unknown;
};

interface ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeErrorPayload(raw: unknown, status: number): ErrorPayload {
  if (isRecord(raw)) {
    if (isRecord(raw.error)) {
      const message = typeof raw.error.message === 'string' && raw.error.message.trim().length > 0
        ? raw.error.message.trim()
        : undefined;
      const code = typeof raw.error.code === 'string' && raw.error.code.trim().length > 0
        ? raw.error.code.trim()
        : undefined;
      const details = Object.prototype.hasOwnProperty.call(raw.error, 'details')
        ? raw.error.details
        : undefined;
      if (message) {
        return { message, code, details };
      }
    }

    if (typeof raw.error === 'string' && raw.error.trim().length > 0) {
      return { message: raw.error.trim() };
    }

    if (typeof raw.detail === 'string' && raw.detail.trim().length > 0) {
      return { message: raw.detail.trim() };
    }

    if (typeof raw.message === 'string' && raw.message.trim().length > 0) {
      return { message: raw.message.trim() };
    }
  }

  if (typeof raw === 'string' && raw.trim().length > 0) {
    return { message: raw.trim() };
  }

  return { message: `Request failed with status ${status}` };
}

function createApiError(payload: ErrorPayload, status: number): ApiError {
  const error = new Error(payload.message) as ApiError;
  error.status = status;
  if (payload.code) {
    error.code = payload.code;
  }
  if (typeof payload.details !== 'undefined') {
    error.details = payload.details;
  }
  return error;
}

// Resolve backend base URL internally (not exported)
function resolveBaseUrl(): string {
  const envBase = typeof import.meta !== 'undefined'
    ? (import.meta.env?.VITE_API_BASE_URL as string | undefined)
    : undefined;
  if (envBase && typeof envBase === 'string' && envBase.trim().length > 0) {
    return envBase.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location;
    if (port === '2590') {
      return `${protocol}//${hostname}:2591`;
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  }
  return 'http://localhost:2591';
}

// Shared request helper
export async function api<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = resolveBaseUrl();
  const url = `${base}${endpoint}`;
  const method = typeof options.method === 'string' ? options.method.toUpperCase() : 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  try {
    const token = localStorage.getItem('auth_token');
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Failed to get auth token:', e);
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    const payload = normalizeErrorPayload(body, response.status);
    if (MUTATION_METHODS.has(method)) {
      toast.error(payload.message);
    }
    throw createApiError(payload, response.status);
  }

  // Show success toast for mutations with a message
  if (MUTATION_METHODS.has(method) && isRecord(body) && typeof body.message === 'string' && body.message.trim().length > 0) {
    toast.success(body.message.trim());
  }

  return (isJson ? body : (undefined as unknown)) as T;
}

export function apiUrl(endpoint: string): string {
  const base = resolveBaseUrl();
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

export function fileUrlFor(id: string): string {
  const cleanId = String(id || '').replace(/\//g, '');
  const base = apiUrl(`/files/${cleanId}`);
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}token=${encodeURIComponent(token)}`;
    }
  } catch {
    // Ignore URL parsing errors
  }
  return base;
}

interface RecordingUpdatePayload {
  transcription?: string;
  verbatimTranscript?: string;
  hotwords?: string[];
  organizedSpeeches?: Array<{
    speakerIndex: number;
    startTime: number;
    endTime: number;
    rawText: string;
    polishedText: string;
  }>;
  speakerNames?: Array<{
    index: number;
    name: string;
  }>;
}

type SegmentRecordingOptions = Pick<SegmentationRequest, 'oracleNumSpeakers' | 'returnText'>;

class ApiService {

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return api<T>(endpoint, options);
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Recordings (adopt backend list envelope)
  async getRecordings(options: { all?: boolean } = {}): Promise<Recording[]> {
    const endpoint = options.all ? '/api/recordings?all=true' : '/api/recordings';
    const data = await this.get<unknown>(endpoint);
    if (Array.isArray(data)) {
      return data as Recording[];
    }
    if (isRecord(data) && Array.isArray((data as any).recordings)) {
      return (data as { recordings: Recording[] }).recordings;
    }
    return [];
  }

  async getRecordingsResponse(options: { all?: boolean } = {}): Promise<{ recordings: Recording[]; fetchedAll?: boolean }> {
    const endpoint = options.all ? '/api/recordings?all=true' : '/api/recordings';
    const data = await this.get<unknown>(endpoint);
    if (Array.isArray(data)) {
      return { recordings: data as Recording[] };
    }
    if (isRecord(data) && Array.isArray((data as any).recordings)) {
      const fetchedAll = typeof (data as any).fetchedAll === 'boolean' ? (data as any).fetchedAll : undefined;
      return { recordings: (data as any).recordings as Recording[], fetchedAll };
    }
    return { recordings: [] };
  }

  // Customization
  async getConfig(): Promise<AppCustomization> {
    return this.get('/api/config');
  }

  async getRecording(id: string): Promise<Recording> {
    return this.get(`/api/recordings/${id}`);
  }

  async startRecording(options?: { meetingId?: string }): Promise<{ id: string; message?: string }> {
    const endpoint = options?.meetingId
      ? `/api/recordings/start?meetingId=${encodeURIComponent(options.meetingId)}`
      : '/api/recordings/start';
    return this.post<{ id: string; message?: string }>(endpoint, {});
  }

  async updateRecording(id: string, data: RecordingUpdatePayload): Promise<{ message: string }> {
    return this.put<{ message: string }>(`/api/recordings/${id}`, data);
  }

  async deleteRecording(id: string) {
    return this.delete(`/api/recordings/${id}`);
  }

  async uploadRecording(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ message: string; recording: Recording }> {
    const url = apiUrl('/api/recordings/upload');
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('audio', file);

      const xhr = new XMLHttpRequest();

      if (xhr.upload && typeof onProgress === 'function') {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        });
      }

      xhr.addEventListener('load', () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        if (!ok) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(xhr.responseText || '{}');
          } catch {
            parsed = xhr.responseText;
          }
          const payload = normalizeErrorPayload(parsed, xhr.status);
          toast.error(payload.message);
          reject(createApiError(payload, xhr.status));
          return;
        }
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          // Show success toast if response has a message
          if (isRecord(data) && typeof data.message === 'string' && data.message.trim().length > 0) {
            toast.success(data.message.trim());
          }
          resolve(data as { message: string; recording: Recording });
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Invalid server response'));
        }
      });

      xhr.addEventListener('error', () => {
        const payload = { message: 'Network error' };
        toast.error(payload.message);
        reject(createApiError(payload, xhr.status || 0));
      });
      xhr.addEventListener('abort', () => {
        const payload = { message: 'Upload aborted' };
        toast.error(payload.message);
        reject(createApiError(payload, xhr.status || 0));
      });
      xhr.addEventListener('timeout', () => {
        const payload = { message: 'Upload timed out' };
        toast.error(payload.message);
        reject(createApiError(payload, xhr.status || 0));
      });

      xhr.open('POST', url);
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      } catch {
    // Ignore URL parsing errors
  }
      xhr.send(formData);
    });
  }

  async transcribeRecording(id: string, hotword?: string): Promise<{ message: string; transcription: string }> {
    const payload: Record<string, unknown> = {};
    
    if (hotword && typeof hotword === 'string' && hotword.trim().length > 0) {
      payload.hotword = hotword.trim();
    }

    return this.post<{ message: string; transcription: string }>(
      `/api/recordings/${id}/transcribe`,
      Object.keys(payload).length > 0 ? payload : undefined
    );
  }

  async segmentRecording(id: string, options: SegmentRecordingOptions = {}): Promise<{ message: string; segments: SpeakerSegment[] }> {
    const payload: Record<string, unknown> = {};

    if (typeof options.oracleNumSpeakers === 'number') {
      payload.oracleNumSpeakers = options.oracleNumSpeakers;
    }

    if (typeof options.returnText === 'boolean') {
      payload.returnText = options.returnText;
    }

    return this.post<{ message: string; segments: SpeakerSegment[] }>(
      `/api/recordings/${id}/segment`,
      Object.keys(payload).length > 0 ? payload : undefined
    );
  }

  async polishRecording(id: string): Promise<{ message: string; polishedTranscription: string }> {
    return this.post<{ message: string; polishedTranscription: string }>(`/api/recordings/${id}/polish`);
  }

  async organizeRecording(id: string): Promise<{ speeches: Array<{ speakerIndex: number; startTime: number; endTime: number; rawText: string; polishedText: string }>; message: string }>{
    const result = await this.post<{ speeches: Array<{ speakerIndex: number; startTime: number; endTime: number; rawText: string; polishedText: string }>; message: string }>(`/api/recordings/${id}/organize`);
    if (Array.isArray(result.speeches) && result.speeches.length > 0) {
      await this.updateRecording(id, { organizedSpeeches: result.speeches });
    }
    return result;
  }

  // Alignment
  async getAlignerModelInfo(): Promise<{ model: string; modelRevision: string; task: string; available: boolean; description: string; }> {
    return this.get('/api/aligner/model-info');
  }

  async alignRecording(id: string, text: string): Promise<{ success: boolean; alignments: Array<{ key: string; text: string; timestamp: number[][] }>; message: string; key: string | null; }> {
    return this.post(`/api/recordings/${id}/align`, { text });
  }

  // Meetings (adopt backend list envelope)
  async getMeetings(options: { all?: boolean } = {}): Promise<Meeting[]> {
    const endpoint = options.all ? '/api/meetings?all=true' : '/api/meetings';
    const data = await this.get<unknown>(endpoint);
    if (Array.isArray(data)) {
      return data as Meeting[];
    }
    if (isRecord(data) && Array.isArray((data as any).meetings)) {
      return (data as { meetings: Meeting[] }).meetings;
    }
    return [];
  }

  async getMeetingsResponse(options: { all?: boolean } = {}): Promise<{ meetings: Meeting[]; fetchedAll?: boolean }> {
    const endpoint = options.all ? '/api/meetings?all=true' : '/api/meetings';
    const data = await this.get<unknown>(endpoint);
    if (Array.isArray(data)) {
      return { meetings: data as Meeting[] };
    }
    if (isRecord(data) && Array.isArray((data as any).meetings)) {
      const fetchedAll = typeof (data as any).fetchedAll === 'boolean' ? (data as any).fetchedAll : undefined;
      return { meetings: (data as any).meetings as Meeting[], fetchedAll };
    }
    return { meetings: [] };
  }

  async getMeeting(id: string): Promise<MeetingWithRecordings> {
    return this.get(`/api/meetings/${id}`);
  }

  async createMeeting(data: unknown): Promise<Meeting> {
    return this.post('/api/meetings', data);
  }

  async updateMeeting(id: string, data: unknown): Promise<Meeting> {
    return this.put(`/api/meetings/${id}`, data);
  }

  async updateMeetingTranscript(id: string, finalTranscript: string): Promise<{ success: boolean; message: string; meeting: Meeting }> {
    return this.put(`/api/meetings/${id}/final-transcript`, { finalTranscript });
  }

  async deleteMeeting(id: string) {
    return this.delete(`/api/meetings/${id}`);
  }

  async concatenateMeetingRecordings(meetingId: string, recordingIds?: string[]): Promise<{
    success?: boolean;
    meeting?: MeetingWithRecordings | null;
    recording: Recording;
    message?: string;
  }> {
    const payload = Array.isArray(recordingIds) && recordingIds.length > 0 ? { recordingIds } : undefined;
    return this.post(`/api/meetings/${meetingId}/concatenate-recordings`, payload);
  }

  async addMeetingMember(meetingId: string, userId: string) {
    return this.post(`/api/meetings/${meetingId}/members`, { userId });
  }

  async removeMeetingMember(meetingId: string, userId: string) {
    return this.delete(`/api/meetings/${meetingId}/members/${userId}`);
  }

  // Hotwords
  async getHotwords() {
    return this.get('/api/hotwords');
  }

  async createHotword(data: unknown) {
    return this.post('/api/hotwords', data);
  }

  async updateHotword(id: string, data: unknown) {
    return this.put(`/api/hotwords/${id}`, data);
  }

  async deleteHotword(id: string) {
    return this.delete(`/api/hotwords/${id}`);
  }

  // Segmentation
  async getSegmentationModelInfo(): Promise<SegmentationModelInfo> {
    return this.get<SegmentationModelInfo>('/api/segmentation/model-info');
  }

  async analyzeSegmentation(request: SegmentationRequest): Promise<SegmentationResponse> {
    const payload: Record<string, unknown> = {
      audioFilePath: request.audioFilePath,
    };

    if (typeof request.oracleNumSpeakers === 'number') {
      payload.oracleNumSpeakers = request.oracleNumSpeakers;
    }

    if (typeof request.returnText === 'boolean') {
      payload.returnText = request.returnText;
    }

    return this.post<SegmentationResponse>('/api/segmentation/analyze', payload);
  }

  async uploadAndSegment(file: File, options: SegmentRecordingOptions = {}): Promise<SegmentationResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (typeof options.oracleNumSpeakers === 'number') {
      formData.append('oracleNumSpeakers', String(options.oracleNumSpeakers));
    }

    if (typeof options.returnText === 'boolean') {
      formData.append('returnText', options.returnText ? 'true' : 'false');
    }

    const url = apiUrl('/api/segmentation/upload');

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }

    if (!response.ok) {
      const payload = normalizeErrorPayload(data, response.status);
      toast.error(payload.message);
      throw createApiError(payload, response.status);
    }

    if (typeof data === 'undefined') {
      const payload = { message: 'Invalid server response' };
      toast.error(payload.message);
      throw createApiError(payload, response.status);
    }

    // Show success toast if response has a message
    if (isRecord(data) && typeof data.message === 'string' && data.message.trim().length > 0) {
      toast.success(data.message.trim());
    }

    return data as SegmentationResponse;
  }

  // AI Advice
  async generateTodoAdvice(meetingId: string, todoText: string): Promise<{ advice: string }> {
    return this.post<{ advice: string }>(`/api/meetings/${meetingId}/todo-advice`, { todoText });
  }

  // Transcript Analysis
  async extractTranscriptAnalysis(meetingId: string): Promise<{
    success: boolean;
    data: {
      disputedIssues: Array<DisputedIssue>;
      todos: Array<Todo>;
      metadata: {
        totalChunks: number;
        processingTime: string;
      };
    };
    message: string;
  }> {
    return this.post(`/api/meetings/${meetingId}/extract-analysis`, {});
  }

  // Meeting ↔ Recording association
  async addRecordingToMeeting(meetingId: string, recordingId: string): Promise<MeetingWithRecordings> {
    return this.post<MeetingWithRecordings>(`/api/meetings/${meetingId}/recordings`, { recordingId });
  }

  async removeRecordingFromMeeting(meetingId: string, recordingId: string): Promise<Meeting> {
    return this.delete<Meeting>(`/api/meetings/${meetingId}/recordings/${recordingId}`);
  }
}

export const apiService = new ApiService();
