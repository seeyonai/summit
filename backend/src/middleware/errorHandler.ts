import type { NextFunction, Request, Response, RequestHandler } from 'express';
import { AppError, isAppError, internal } from '../utils/errors';

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
