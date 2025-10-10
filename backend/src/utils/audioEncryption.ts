import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const MAGIC_HEADER = Buffer.from('SUME', 'utf8');
const FORMAT_VERSION = 1;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let cachedKey: Buffer | null | undefined;

function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('AUDIO_ENCRYPTION_KEY must not be empty');
  }

  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    if (trimmed.length !== 64) {
      throw new Error('AUDIO_ENCRYPTION_KEY hex value must be 64 characters for AES-256-GCM');
    }
    return Buffer.from(trimmed, 'hex');
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64');
    if (decoded.length === 32) {
      return decoded;
    }
  } catch (error) {
    throw new Error('AUDIO_ENCRYPTION_KEY must be a valid base64 or hex encoded value');
  }

  throw new Error('AUDIO_ENCRYPTION_KEY base64 value must decode to 32 bytes for AES-256-GCM');
}

export function getAudioEncryptionKey(): Buffer | null {
  if (cachedKey !== undefined) {
    return cachedKey;
  }

  const envKey = process.env.AUDIO_ENCRYPTION_KEY;
  console.info('AUDIO_ENCRYPTION_KEY ending with:', envKey?.slice(-5));
  if (!envKey) {
    cachedKey = null;
    return cachedKey;
  }

  cachedKey = decodeKey(envKey);
  return cachedKey;
}

function buildEncryptedPayload(plaintext: Buffer): Buffer {
  const key = getAudioEncryptionKey();
  if (!key) {
    return plaintext;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([
    MAGIC_HEADER,
    Buffer.from([FORMAT_VERSION]),
    iv,
    ciphertext,
    authTag,
  ]);
}

function isEncryptedPayload(payload: Buffer): boolean {
  if (payload.length < MAGIC_HEADER.length + 1 + IV_LENGTH + AUTH_TAG_LENGTH) {
    return false;
  }

  const header = payload.subarray(0, MAGIC_HEADER.length);
  return header.equals(MAGIC_HEADER);
}

function extractEncryptedSections(payload: Buffer): { iv: Buffer; ciphertext: Buffer; authTag: Buffer } {
  const versionOffset = MAGIC_HEADER.length;
  const version = payload.readUInt8(versionOffset);

  if (version !== FORMAT_VERSION) {
    throw new Error(`Unsupported audio encryption payload version: ${version}`);
  }

  const ivStart = versionOffset + 1;
  const ivEnd = ivStart + IV_LENGTH;
  const ciphertextEnd = payload.length - AUTH_TAG_LENGTH;

  if (ciphertextEnd <= ivEnd) {
    throw new Error('Invalid encrypted audio payload: ciphertext is missing');
  }

  return {
    iv: payload.subarray(ivStart, ivEnd),
    ciphertext: payload.subarray(ivEnd, ciphertextEnd),
    authTag: payload.subarray(ciphertextEnd),
  };
}

function decryptPayload(payload: Buffer): Buffer {
  if (!isEncryptedPayload(payload)) {
    return payload;
  }

  const key = getAudioEncryptionKey();
  if (!key) {
    throw new Error('AUDIO_ENCRYPTION_KEY is required to decrypt stored audio files');
  }
  const { iv, ciphertext, authTag } = extractEncryptedSections(payload);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function writeEncryptedFile(destinationPath: string, data: Buffer): Promise<void> {
  const encrypted = buildEncryptedPayload(data);
  await fs.writeFile(destinationPath, encrypted);
}

export async function readDecryptedFile(filePath: string): Promise<Buffer> {
  const payload = await fs.readFile(filePath);
  return decryptPayload(payload);
}

export async function decryptFileToTempPath(filePath: string): Promise<{ tempPath: string; cleanup: () => Promise<void> }> {
  const payload = await fs.readFile(filePath);

  if (!isEncryptedPayload(payload)) {
    return {
      tempPath: filePath,
      cleanup: async () => undefined,
    };
  }

  const plaintext = decryptPayload(payload);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-audio-'));
  const extension = path.extname(filePath) || '.dat';
  const tempPath = path.join(tempDir, `decrypted${extension}`);
  await fs.writeFile(tempPath, plaintext);

  const cleanup = async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  };

  return { tempPath, cleanup };
}

export function isAudioEncryptionEnabled(): boolean {
  return getAudioEncryptionKey() !== null;
}

export function clearCachedAudioKey(): void {
  cachedKey = undefined;
}
