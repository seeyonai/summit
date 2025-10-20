import path from 'path';
import { resolveExistingPathFromCandidate } from './filePaths';
import { isAudioEncryptionEnabled } from './audioEncryption';

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

export function inferRecordingExtension(format?: string): string {
  const normalized = (format || '').toString().trim().replace(/^\.+/, '').toLowerCase();
  return normalized.length > 0 ? normalized : 'wav';
}

export function buildRecordingFilename(id: string, format?: string): string {
  const extension = inferRecordingExtension(format);
  return isAudioEncryptionEnabled()
    ? `${id}.encrypted.${extension}`
    : `${id}.${extension}`;
}

export function getRecordingFilenameVariants(id: string, format?: string): string[] {
  const extension = inferRecordingExtension(format);
  const base = `${id}.${extension}`;
  const encrypted = `${id}.encrypted.${extension}`;
  const variants = isAudioEncryptionEnabled()
    ? [encrypted, base]
    : [base, encrypted];

  return Array.from(new Set(variants));
}

export async function findRecordingFilePath(baseDir: string, id: string, format?: string): Promise<string | null> {
  const variants = getRecordingFilenameVariants(id, format);
  for (const candidate of variants) {
    try {
      const absolutePath = await resolveExistingPathFromCandidate(baseDir, candidate);
      return absolutePath;
    } catch (error) {
      const nodeErr = error as NodeJS.ErrnoException;
      if (!nodeErr.code || nodeErr.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  return null;
}

export async function findRecordingWorkingFilePath(baseDir: string, id: string, format?: string): Promise<string | null> {
  const preferredExts = (() => {
    const ext = inferRecordingExtension(format);
    return ext === 'wav' ? ['wav'] : ['wav', ext];
  })();

  for (const ext of preferredExts) {
    const variants = getRecordingFilenameVariants(id, ext);
    for (const candidate of variants) {
      try {
        const absolutePath = await resolveExistingPathFromCandidate(baseDir, candidate);
        return absolutePath;
      } catch (error) {
        const nodeErr = error as NodeJS.ErrnoException;
        if (!nodeErr.code || nodeErr.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }
  return null;
}

export default {
  getMimeType,
  normalizeTranscriptText,
  inferRecordingExtension,
  buildRecordingFilename,
  getRecordingFilenameVariants,
  findRecordingFilePath,
  findRecordingWorkingFilePath,
};
