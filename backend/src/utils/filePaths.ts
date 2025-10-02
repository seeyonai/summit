import { promises as fs } from 'fs';
import path from 'path';

export function getFilesBaseDir(): string {
  const envBase = process.env.RECORDING_FILE_DIR || process.env.FILE_BASE_PATH;
  if (envBase && envBase.trim().length > 0) {
    return path.isAbsolute(envBase) ? envBase : path.resolve(envBase);
  }
  // Default to repository-level /files directory for development
  return path.resolve(process.cwd(), '..', 'files');
}

export function normalizePublicOrRelative(input: string): string {
  const s = (input || '').replace(/\\/g, '/');
  if (s.startsWith('/files/')) {
    return s.substring('/files/'.length);
  }
  if (s.startsWith('files/')) {
    return s.substring('files/'.length);
  }
  return s.replace(/^\//, '');
}

export function resolveWithinBase(base: string, relativePath: string): string {
  const absolutePath = path.resolve(base, relativePath);
  const relativeToBase = path.relative(base, absolutePath);
  if (relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase)) {
    throw new Error('Invalid audio file path');
  }
  return absolutePath;
}

export function makeRelativeToBase(base: string, absoluteOrRelative: string): string {
  const input = (absoluteOrRelative || '').replace(/\\/g, '/');
  if (path.isAbsolute(input)) {
    const rel = path.relative(base, input);
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
      return rel.replace(/\\/g, '/');
    }
  }
  return normalizePublicOrRelative(input);
}

function normalizeCandidate(base: string, candidate: string): string {
  const relative = makeRelativeToBase(base, candidate);
  return path.normalize(relative).replace(/^[/\\]+/, '');
}

export function resolvePathFromCandidate(base: string, candidate: string): string {
  const normalizedRelative = normalizeCandidate(base, candidate);
  return resolveWithinBase(base, normalizedRelative);
}

export async function resolveExistingPathFromCandidate(base: string, candidate: string): Promise<string> {
  const absolutePath = resolvePathFromCandidate(base, candidate);
  await fs.access(absolutePath);
  return absolutePath;
}
