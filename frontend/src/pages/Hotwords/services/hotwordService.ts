import type { Hotword, HotwordCreate, HotwordUpdate } from '@/types';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';

export interface HotwordService {
  getHotwords: () => Promise<Hotword[]>;
  createHotword: (hotword: HotwordCreate) => Promise<Hotword>;
  updateHotword: (hotword: HotwordUpdate) => Promise<Hotword>;
  deleteHotword: (id: string) => Promise<void>;
  toggleHotwordStatus: (id: string, isActive: boolean) => Promise<Hotword>;
}

const createHotwordService = (api: any): HotwordService => ({
  getHotwords: async () => {
    const response = await api(API_ENDPOINTS.BACKEND.HOTWORDS);
    return response;
  },

  createHotword: async (hotword: HotwordCreate) => {
    const response = await api(API_ENDPOINTS.BACKEND.HOTWORDS, {
      method: 'POST',
      body: JSON.stringify(hotword),
    });
    return response;
  },

  updateHotword: async (hotword: HotwordUpdate) => {
    const response = await api(API_ENDPOINTS.BACKEND.HOTWORD_DETAIL(hotword._id), {
      method: 'PUT',
      body: JSON.stringify(hotword),
    });
    return response;
  },

  deleteHotword: async (id: string) => {
    await api(API_ENDPOINTS.BACKEND.HOTWORD_DETAIL(id), {
      method: 'DELETE',
    });
  },

  toggleHotwordStatus: async (id: string, isActive: boolean) => {
    const response = await api(API_ENDPOINTS.BACKEND.HOTWORD_DETAIL(id), {
      method: 'PUT',
      body: JSON.stringify({ _id: id, isActive }),
    });
    return response;
  },
});

export default createHotwordService;