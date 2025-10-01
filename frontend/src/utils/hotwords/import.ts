import { sanitizeHotword, validateHotword } from '@/utils/hotwords';

export interface ParsedHotwordsResult {
  valid: string[];
  invalid: { line: number; value: string; reason: string }[];
  duplicates: string[];
}

export const parseHotwordsFromText = (text: string): ParsedHotwordsResult => {
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  const set = new Set<string>();
  const valid: string[] = [];
  const invalid: { line: number; value: string; reason: string }[] = [];
  const duplicates: string[] = [];

  lines.forEach((raw, idx) => {
    // Support simple CSV by splitting on commas if present (no quote handling)
    const cells = raw.includes(',') ? raw.split(',') : [raw];
    cells.forEach((cell) => {
      const sanitized = sanitizeHotword(cell);
      const key = sanitized.toLowerCase();
      if (!sanitized) {
        if (cell.trim().length > 0) {
          invalid.push({ line: idx + 1, value: cell, reason: 'empty' });
        }
        return;
      }
      const { isValid, errors } = validateHotword(sanitized);
      if (!isValid) {
        invalid.push({ line: idx + 1, value: sanitized, reason: errors[0] || 'invalid' });
        return;
      }
      if (set.has(key)) {
        duplicates.push(sanitized);
        return;
      }
      set.add(key);
      valid.push(sanitized);
    });
  });

  return { valid, invalid, duplicates };
};

export const readHotwordsFromFile = async (file: File): Promise<ParsedHotwordsResult> => {
  const text = await file.text();
  return parseHotwordsFromText(text);
};

