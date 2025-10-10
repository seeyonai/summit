import type { NextFunction, Request, Response, RequestHandler } from 'express';
import { AppError, isAppError, internal } from '../utils/errors';
import { debugWarn } from '../utils/logger';
import { setAuditContext } from './audit';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const resolvedError: AppError = isAppError(error)
    ? error
    : internal('Internal server error', 'internal_error');

  if (!isAppError(error)) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', error);
    debugWarn('Unhandled error (debug):', { method: req.method, path: req.originalUrl });
    setAuditContext(res, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unhandled error',
    });
  } else {
    debugWarn('Handled AppError', { method: req.method, path: req.originalUrl, code: resolvedError.code, status: resolvedError.status });
    setAuditContext(res, {
      status: resolvedError.status >= 500 ? 'error' : 'failure',
      error: resolvedError.code,
    });
  }

  const payload: Record<string, unknown> = {
    error: {
      message: resolvedError.message,
      code: resolvedError.code,
    },
  };

  if (typeof resolvedError.details !== 'undefined') {
    (payload.error as Record<string, unknown>).details = resolvedError.details;
  }

  res.status(resolvedError.status).json(payload);
}
