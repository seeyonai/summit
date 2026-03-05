const DEFAULT_UPLOAD_MAX_SIZE_LABEL = '2G';
const DEFAULT_UPLOAD_MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

const SIZE_MULTIPLIERS: Record<string, number> = {
  B: 1,
  K: 1024,
  KB: 1024,
  M: 1024 * 1024,
  MB: 1024 * 1024,
  G: 1024 * 1024 * 1024,
  GB: 1024 * 1024 * 1024,
};

function parseSizeToBytes(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) {
    return undefined;
  }

  const match = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]{0,2})$/.exec(value);
  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  const multiplier = SIZE_MULTIPLIERS[unit];

  if (!Number.isFinite(amount) || amount <= 0 || !multiplier) {
    return undefined;
  }

  const parsedBytes = Math.floor(amount * multiplier);
  if (!Number.isFinite(parsedBytes) || parsedBytes <= 0) {
    return undefined;
  }

  return parsedBytes;
}

const configuredUploadMaxSize = ((import.meta.env?.VITE_UPLOAD_MAX_SIZE as string | undefined) || '').trim();
const parsedConfiguredUploadMaxSize = configuredUploadMaxSize ? parseSizeToBytes(configuredUploadMaxSize) : undefined;

export const uploadMaxSizeBytes = parsedConfiguredUploadMaxSize || DEFAULT_UPLOAD_MAX_SIZE_BYTES;
export const uploadMaxSizeLabel = parsedConfiguredUploadMaxSize ? configuredUploadMaxSize : DEFAULT_UPLOAD_MAX_SIZE_LABEL;
