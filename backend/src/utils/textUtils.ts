export const sanitizeTranscript = (text: string): string => {
  return text
    .replace(/[\p{P}]+/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
