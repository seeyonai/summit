export type AppErrorOptions = {
  code?: string;
  details?: unknown;
};

export class AppError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = options.code;
    this.details = options.details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function createAppError(
  message: string,
  status: number,
  options: AppErrorOptions = {}
): AppError {
  return new AppError(message, status, options);
}

export function badRequest(message: string, code: string = 'bad_request', details?: unknown): AppError {
  return new AppError(message, 400, { code, details });
}

export function unauthorized(message: string, code: string = 'unauthorized', details?: unknown): AppError {
  return new AppError(message, 401, { code, details });
}

export function forbidden(message: string, code: string = 'forbidden', details?: unknown): AppError {
  return new AppError(message, 403, { code, details });
}

export function notFound(message: string, code: string = 'not_found', details?: unknown): AppError {
  return new AppError(message, 404, { code, details });
}

export function conflict(message: string, code: string = 'conflict', details?: unknown): AppError {
  return new AppError(message, 409, { code, details });
}

export function unprocessable(message: string, code: string = 'unprocessable_entity', details?: unknown): AppError {
  return new AppError(message, 422, { code, details });
}

export function internal(message: string, code: string = 'internal_error', details?: unknown): AppError {
  return new AppError(message, 500, { code, details });
}
