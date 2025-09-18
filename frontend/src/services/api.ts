import type { Meeting, MeetingWithRecordings, Recording, SegmentationModelInfo, SegmentationRequest, SegmentationResponse, SpeakerSegment } from '@/types';

interface RecordingUpdatePayload {
  filename?: string;
  transcription?: string;
  verbatimTranscript?: string;
}

type SegmentRecordingOptions = Pick<SegmentationRequest, 'oracleNumSpeakers' | 'returnText'>;

const API_BASE_URL = 'http://localhost:2591';
const BACKEND_API_BASE_URL = 'http://localhost:2591';

class ApiService {
  private getBaseUrl(endpoint: string): string {
    if (endpoint.startsWith('/api/meetings') || endpoint.startsWith('/api/hotwords') || endpoint.startsWith('/api/segmentation')) {
      return BACKEND_API_BASE_URL;
    }
    return API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = this.getBaseUrl(endpoint);
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
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

  async transcribeRecording(id: string): Promise<{ message: string; transcription: string }> {
    return this.post<{ message: string; transcription: string }>(`/api/recordings/${id}/transcribe`);
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

    const baseUrl = this.getBaseUrl('/api/segmentation/upload');
    const url = `${baseUrl}/api/segmentation/upload`;

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
}

export const apiService = new ApiService();
