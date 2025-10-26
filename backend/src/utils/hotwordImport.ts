import { sanitizeHotword, validateHotword, type HotwordValidationError } from './hotwordValidation';

export interface HotwordImportIssue {
  line: number;
  value: string;
  reason: HotwordValidationError | 'duplicate' | 'empty';
}

export interface HotwordImportParseResult {
  valid: string[];
  invalid: HotwordImportIssue[];
  duplicates: string[];
  totalEntries: number;
}

const splitCsvLine = (line: string): string[] => {
  if (line.includes(',')) {
    return line.split(',');
  }
  return [line];
};

export const parseHotwordsFromText = (rawText: string): HotwordImportParseResult => {
  const text = (rawText || '').replace(/^\uFEFF/, '');
  const lines = text.split(/\r\n|\n|\r/);
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: HotwordImportIssue[] = [];
  const duplicates: string[] = [];
  let total = 0;

  lines.forEach((line, idx) => {
    const cells = splitCsvLine(line);
    cells.forEach((cell) => {
      const original = typeof cell === 'string' ? cell : String(cell);
      const sanitized = sanitizeHotword(original);
      if (!sanitized) {
        if (original.trim().length > 0) {
          invalid.push({ line: idx + 1, value: original.trim(), reason: 'empty' });
          total += 1;
        }
        return;
      }
      total += 1;
      const key = sanitized.toLowerCase();
      if (seen.has(key)) {
        duplicates.push(sanitized);
        return;
      }
      const validationError = validateHotword(sanitized);
      if (validationError) {
        invalid.push({ line: idx + 1, value: sanitized, reason: validationError });
        return;
      }
      seen.add(key);
      valid.push(sanitized);
    });
  });

  return {
    valid,
    invalid,
    duplicates,
    totalEntries: total,
  };
};

export const parseHotwordsFromBuffer = (buffer: Buffer): HotwordImportParseResult => {
  const text = buffer.toString('utf8');
  return parseHotwordsFromText(text);
};
