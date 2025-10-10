import { promises as fs } from 'fs';
import path from 'path';

const AUDIT_LOG_DISABLED_VALUES = new Set(['false', '0', 'off', 'disabled']);

const auditLogPath = (() => {
  const override = process.env.AUDIT_LOG_PATH;
  if (override && override.trim().length > 0) {
    return path.isAbsolute(override) ? override : path.resolve(process.cwd(), override);
  }
  return path.resolve(process.cwd(), 'logs', 'audit.log');
})();

let ensured = false;
let pendingWrite: Promise<void> = Promise.resolve();

export type AuditStatus = 'success' | 'failure' | 'access_denied' | 'error' | string;

export interface AuditEvent {
  action: string;
  status: AuditStatus;
  actorId?: string;
  actorRole?: string;
  resource?: string;
  resourceId?: string;
  httpMethod?: string;
  route?: string;
  ip?: string;
  correlationId?: string;
  userAgent?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
  error?: string;
  timestamp?: string;
}

function isAuditEnabled(): boolean {
  const raw = (process.env.AUDIT_LOG_ENABLED || '').trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return !AUDIT_LOG_DISABLED_VALUES.has(raw);
}

async function ensureLogFile(): Promise<void> {
  if (ensured) {
    return;
  }
  const dir = path.dirname(auditLogPath);
  await fs.mkdir(dir, { recursive: true });
  ensured = true;
}

export async function ensureAuditLoggerReady(): Promise<void> {
  if (!isAuditEnabled()) {
    return;
  }
  await ensureLogFile();
}

function safeSerialize(event: AuditEvent): string {
  const payload = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };
  return JSON.stringify(payload);
}

export async function writeAuditEvent(event: AuditEvent): Promise<void> {
  if (!isAuditEnabled()) {
    return;
  }
  const line = `${safeSerialize(event)}\n`;
  pendingWrite = pendingWrite.then(async () => {
    await ensureLogFile();
    await fs.appendFile(auditLogPath, line, 'utf-8');
  }).catch((error) => {
    ensured = false;
    if (process.env.LOG_LEVEL?.toLowerCase() === 'debug') {
      // eslint-disable-next-line no-console
      console.warn('Audit log write failed:', error);
    }
  });
  await pendingWrite;
}

export function getAuditLogPath(): string {
  return auditLogPath;
}
