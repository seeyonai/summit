import type { Meeting, MeetingWithRecordings, Recording, SegmentationModelInfo, SegmentationRequest, SegmentationResponse, SpeakerSegment } from '@/types';

// Resolve backend base URL internally (not exported)
function resolveBaseUrl(): string {
  const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
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
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  if (!response.ok) {
    const detail = isJson ? await response.json().catch(() => undefined) : undefined;
    const message = typeof (detail as any)?.detail === 'string' ? (detail as any).detail : `HTTP error! status: ${response.status}`;
    throw new Error(message);
  }
  return (isJson ? await response.json() : (undefined as unknown)) as T;
}

export function apiUrl(endpoint: string): string {
  const base = resolveBaseUrl();
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

interface RecordingUpdatePayload {
  filename?: string;
  transcription?: string;
  verbatimTranscript?: string;
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

  // Recordings
  async getRecordings(): Promise<Recording[]> {
    return this.get('/api/recordings');
  }

  async getRecording(id: string): Promise<Recording> {
    return this.get(`/api/recordings/${id}`);
  }

  async startRecording() {
    return this.post('/api/recordings/start');
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
          try {
            const parsed = JSON.parse(xhr.responseText || '{}');
            const msg = typeof parsed?.error === 'string' ? parsed.error : `HTTP error! status: ${xhr.status}`;
            reject(new Error(msg));
          } catch {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
          return;
        }
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          resolve(data as { message: string; recording: Recording });
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Invalid server response'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out'));
      });

      xhr.open('POST', url);
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

  // Meetings
  async getMeetings(): Promise<Meeting[]> {
    return this.get('/api/meetings');
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

  async deleteMeeting(id: string) {
    return this.delete(`/api/meetings/${id}`);
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

    const data = await response.json();

    if (!response.ok) {
      const detail = typeof data?.detail === 'string' ? data.detail : undefined;
      throw new Error(detail || `HTTP error! status: ${response.status}`);
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
      disputedIssues: Array<{
        id: string;
        text: string;
        severity: 'low' | 'medium' | 'high';
        parties: string[];
      }>;
      todos: Array<{
        id: string;
        text: string;
        completed: boolean;
        assignee?: string;
        dueDate?: string;
        priority: 'low' | 'medium' | 'high';
        category?: string;
      }>;
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
  async addRecordingToMeeting(meetingId: string, recording: Recording): Promise<MeetingWithRecordings> {
    return this.post<MeetingWithRecordings>(`/api/meetings/${meetingId}/recordings`, recording);
  }
}

export const apiService = new ApiService();
