const HOTWORD_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$/u;

export type HotwordValidationError = 'empty' | 'too_short' | 'too_long' | 'invalid_chars';

export const sanitizeHotword = (value: string): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ');
};

export const validateHotword = (value: string): HotwordValidationError | null => {
  const word = (value || '').trim();
  if (!word) {
    return 'empty';
  }
  if (word.length < 1) {
    return 'too_short';
  }
  if (word.length > 50) {
    return 'too_long';
  }
  if (!HOTWORD_REGEX.test(word)) {
    return 'invalid_chars';
  }
  return null;
};
