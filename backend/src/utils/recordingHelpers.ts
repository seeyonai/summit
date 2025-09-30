import path from 'path';

export function getMimeType(filename: string): string {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case '.wav':
      return 'audio/wav';
    case '.mp3':
      return 'audio/mpeg';
    case '.flac':
      return 'audio/flac';
    case '.m4a':
      return 'audio/m4a';
    default:
      return 'application/octet-stream';
  }
}

export function normalizeTranscriptText(text: string): string {
  const trimmed = text.trim();
  const singleSpaced = trimmed.replace(/\s+/g, ' ');
  return singleSpaced.charAt(0).toUpperCase() + singleSpaced.slice(1);
}

export default {
  getMimeType,
  normalizeTranscriptText,
};
