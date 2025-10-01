import type { Request } from 'express';

export type Lang = 'en' | 'zh';

export function getPreferredLang(req: Request): Lang {
  const raw = (req.headers['accept-language'] || req.headers['Accept-Language'] || '').toString().toLowerCase();
  if (raw.includes('zh') || raw.includes('cn')) {
    return 'zh';
  }
  return 'en';
}

