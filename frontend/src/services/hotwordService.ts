import type { Hotword, HotwordCreate, HotwordUpdate, HotwordBulkImportResult } from '@/types';
import { api as defaultApi } from '@/services/api';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';

type ApiClient = <T = unknown>(endpoint: string, options?: RequestInit) => Promise<T>;

export interface HotwordService {
  getHotwords: () => Promise<Hotword[]>;
  createHotword: (hotword: HotwordCreate) => Promise<Hotword>;
  updateHotword: (hotword: HotwordUpdate) => Promise<Hotword>;
  deleteHotword: (id: string) => Promise<void>;
  toggleHotwordStatus: (id: string, isActive: boolean) => Promise<Hotword>;
  importHotwordsBulk: (words: string[], isPublic?: boolean) => Promise<HotwordBulkImportResult>;
}

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
});

export default createHotwordService;
