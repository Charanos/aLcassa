import { ERROR_CODES, ERROR_MESSAGES, ERROR_STATUS, type ErrorCode } from './catalogue';

export { ERROR_CODES, ERROR_MESSAGES, ERROR_STATUS };
export type { ErrorCode };

/** 07 §1. One envelope, both doors. */
export type ApiErrorDetail = { field: string; code: string; message: string };

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
  };
};

export type ApiSuccessBody<T> = {
  data: T;
  meta?: { nextCursor?: string | null; total?: number };
};

/**
 * The one error type a service raises. It carries the catalogue code, so a
 * route handler never chooses a status: the catalogue does. That is what keeps
 * `404 not 403` from being a thing anyone has to remember.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: ApiErrorDetail[] | undefined;
  /** Detail that goes to the log and never to the client. */
  readonly internal: Record<string, unknown> | undefined;

  constructor(
    code: ErrorCode,
    options: {
      message?: string;
      details?: ApiErrorDetail[];
      internal?: Record<string, unknown>;
      cause?: unknown;
    } = {},
  ) {
    super(options.message ?? ERROR_MESSAGES[code], { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = options.details;
    this.internal = options.internal;
  }

  toBody(requestId: string): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
        requestId,
      },
    };
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * The only way to say "not visible" in this codebase.
 *
 * A resource belonging to another tenant is indistinguishable from one that
 * does not exist, because RLS filters rather than errors: the query simply
 * returned no rows and the handler genuinely cannot tell the difference. That
 * is the design working, and this helper exists so nobody is ever tempted to
 * reach for a 403 to be more informative. 07 §1 · 11 §6 rule 7.
 */
export function notFound(entity?: string): AppError {
  return new AppError(ERROR_CODES.NOT_FOUND, {
    ...(entity ? { internal: { entity } } : {}),
  });
}

export function validationFailed(details: ApiErrorDetail[]): AppError {
  return new AppError(ERROR_CODES.VALIDATION_FAILED, { details });
}
