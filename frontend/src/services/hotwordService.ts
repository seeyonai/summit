import type { Hotword, HotwordCreate, HotwordUpdate, HotwordBulkImportResult, HotwordImportResponse } from '@/types';
import { api as defaultApi, apiUrl } from '@/services/api';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';

type ApiClient = <T = unknown>(endpoint: string, options?: RequestInit) => Promise<T>;

export interface HotwordService {
  getHotwords: () => Promise<Hotword[]>;
  createHotword: (hotword: HotwordCreate) => Promise<Hotword>;
  updateHotword: (hotword: HotwordUpdate) => Promise<Hotword>;
  deleteHotword: (id: string) => Promise<void>;
  toggleHotwordStatus: (id: string, isActive: boolean) => Promise<Hotword>;
  importHotwordsBulk: (words: string[], isPublic?: boolean) => Promise<HotwordBulkImportResult>;
  importHotwordsFromFile: (file: File, options?: { isPublic?: boolean }) => Promise<HotwordImportResponse>;
  exportHotwords: () => Promise<{ blob: Blob; filename: string }>;
  discoverHotwords: (text: string) => Promise<string[]>;
}

const extractErrorMessage = (payload: unknown): string | undefined => {
  if (!payload) return undefined;
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload.trim();
  }
  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return record.message.trim();
    }
    if (typeof record.error === 'string' && record.error.trim().length > 0) {
      return record.error.trim();
    }
    if (record.error && typeof record.error === 'object' && typeof (record.error as Record<string, unknown>).message === 'string') {
      const msg = (record.error as Record<string, unknown>).message as string;
      if (msg.trim().length > 0) {
        return msg.trim();
      }
    }
    if (typeof record.detail === 'string' && record.detail.trim().length > 0) {
      return record.detail.trim();
    }
  }
  return undefined;
};

const fetchWithAuth = (endpoint: string, options: RequestInit = {}) => {
  const url = apiUrl(endpoint);
  const headers = new Headers(options.headers as HeadersInit);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch {
    // Ignore storage access failures
  }
  return fetch(url, {
    ...options,
    headers,
  });
};

const defaultFilename = () => `hotwords-${new Date().toISOString().slice(0, 10)}.csv`;

const resolveFilename = (disposition: string | null): string => {
  if (!disposition) {
    return defaultFilename();
  }
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return defaultFilename();
};

export const createHotwordService = (client: ApiClient = defaultApi): HotwordService => ({
  getHotwords: async () => client<Hotword[]>(API_ENDPOINTS.BACKEND.HOTWORDS),

  createHotword: async (hotword: HotwordCreate) => client<Hotword>(
    API_ENDPOINTS.BACKEND.HOTWORDS,
    {
      method: 'POST',
      body: JSON.stringify(hotword),
    }
  ),

  updateHotword: async (hotword: HotwordUpdate) => client<Hotword>(
    API_ENDPOINTS.BACKEND.HOTWORD_DETAIL(hotword._id),
    {
      method: 'PUT',
      body: JSON.stringify(hotword),
    }
  ),

  deleteHotword: async (id: string) => {
    await client(API_ENDPOINTS.BACKEND.HOTWORD_DETAIL(id), {
      method: 'DELETE',
    });
  },

  toggleHotwordStatus: async (id: string, isActive: boolean) => client<Hotword>(
    API_ENDPOINTS.BACKEND.HOTWORD_DETAIL(id),
    {
      method: 'PUT',
      body: JSON.stringify({ _id: id, isActive }),
    }
  ),

  importHotwordsBulk: async (words: string[], isPublic?: boolean) => client<HotwordBulkImportResult>(
    API_ENDPOINTS.BACKEND.HOTWORDS_BULK,
    {
      method: 'POST',
      body: JSON.stringify({ words, isPublic }),
    }
  ),

  importHotwordsFromFile: async (file: File, options?: { isPublic?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (typeof options?.isPublic === 'boolean') {
      formData.append('isPublic', String(options.isPublic));
    }

    const response = await fetchWithAuth(API_ENDPOINTS.BACKEND.HOTWORDS_IMPORT, {
      method: 'POST',
      body: formData,
    });
    const payload = await response.json().catch(() => undefined);
    if (!response.ok) {
      const message = extractErrorMessage(payload) || '导入失败，请稍后重试';
      throw new Error(message);
    }
    return payload as HotwordImportResponse;
  },

  exportHotwords: async () => {
    const response = await fetchWithAuth(API_ENDPOINTS.BACKEND.HOTWORDS_EXPORT, {
      method: 'GET',
      headers: {
        Accept: 'text/csv,application/json;q=0.9,*/*;q=0.8',
      },
    });
    if (!response.ok) {
      const text = await response.text();
      let message: string | undefined;
      try {
        const parsed = text ? JSON.parse(text) : undefined;
        message = extractErrorMessage(parsed);
      } catch {
        message = text?.trim();
      }
      throw new Error(message || '导出失败，请稍后重试');
    }
    const blob = await response.blob();
    const filename = resolveFilename(response.headers.get('content-disposition'));
    return { blob, filename };
  },

  discoverHotwords: async (text: string) => {
    const result = await client<{ hotwords: string[] }>(
      API_ENDPOINTS.BACKEND.HOTWORDS_DISCOVER,
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      }
    );
    return result.hotwords;
  },
});

export default createHotwordService;
