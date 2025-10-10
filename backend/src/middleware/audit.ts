import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { RequestWithUser } from '../types/auth';
import { writeAuditEvent } from '../utils/auditLogger';
import type { AuditEvent, AuditStatus } from '../utils/auditLogger';

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

export interface AuditContext {
  action?: string;
  status?: AuditStatus;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  force?: boolean;
  error?: string;
}

declare module 'express-serve-static-core' {
  interface ResponseLocals {
    audit?: AuditContext;
  }
}

const DEFAULT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const successStatus = (code: number): AuditStatus => {
  if (code >= 500) return 'error';
  if (code === 401 || code === 403) return 'access_denied';
  if (code >= 400) return 'failure';
  return 'success';
};

const scrubPath = (originalUrl: string): string => {
  const idx = originalUrl.indexOf('?');
  return idx === -1 ? originalUrl : originalUrl.slice(0, idx);
};

const toAuditEvent = (
  req: RequestWithUser,
  res: Response,
  context: AuditContext | undefined,
  durationMs: number,
): AuditEvent => {
  const locals: Mutable<Response['locals']> = res.locals;
  const method = req.method.toUpperCase();
  const resolvedStatus = context?.status ?? successStatus(res.statusCode);
  const action = context?.action || `${method}_${scrubPath(req.originalUrl).replace(/[/:]/g, '_') || 'http_request'}`;

  const event: AuditEvent = {
    action,
    status: resolvedStatus,
    actorId: req.user?.userId,
    actorRole: req.user?.role,
    resource: context?.resource,
    resourceId: context?.resourceId,
    httpMethod: method,
    route: scrubPath(req.originalUrl),
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
    durationMs,
    details: context?.details,
    error: context?.error,
  };

  if (locals.audit && locals.audit !== context) {
    // Preserve any late modifications made by downstream handlers
    event.details = locals.audit.details ?? event.details;
    event.error = locals.audit.error ?? event.error;
    event.resource = locals.audit.resource ?? event.resource;
    event.resourceId = locals.audit.resourceId ?? event.resourceId;
    event.status = locals.audit.status ?? event.status;
    event.action = locals.audit.action ?? event.action;
  }

  return event;
};

const shouldLog = (req: Request, context: AuditContext | undefined): boolean => {
  const method = req.method.toUpperCase();
  if (context?.force) {
    return true;
  }
  if (context && typeof context.action === 'string') {
    return true;
  }
  return DEFAULT_METHODS.has(method);
};

export const auditMiddleware = (): RequestHandler => (req: RequestWithUser, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.locals.audit = res.locals.audit || {};

  res.on('finish', () => {
    const context = res.locals.audit;
    if (!shouldLog(req, context)) {
      return;
    }

    const event = toAuditEvent(req, res, context, Date.now() - start);
    void writeAuditEvent(event);
  });

  next();
};

export const setAuditContext = (res: Response, context: AuditContext): void => {
  res.locals.audit = {
    ...(res.locals.audit || {}),
    ...context,
  };
};
