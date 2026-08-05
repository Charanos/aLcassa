import { NextResponse } from 'next/server';
import { AppError, ERROR_CODES, isAppError, type ApiSuccessBody } from '@/lib/errors';

/**
 * 07 §1. One envelope, both doors. Requirement 6 asks for one typed error
 * contract across the API and this is the only place either shape is built.
 */

export function jsonOk<T>(
  data: T,
  init: {
    status?: number;
    meta?: ApiSuccessBody<T>['meta'];
    headers?: Record<string, string>;
    requestId: string;
  },
): NextResponse<ApiSuccessBody<T>> {
  const body: ApiSuccessBody<T> = init.meta ? { data, meta: init.meta } : { data };

  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: {
      'X-Request-Id': init.requestId,
      ...init.headers,
    },
  });
}

export function jsonNoContent(requestId: string): NextResponse {
  return new NextResponse(null, { status: 204, headers: { 'X-Request-Id': requestId } });
}

/**
 * The only place a status is chosen, and it is chosen by the catalogue rather
 * than by a handler. That is what stops "404 not 403 for another tenant's
 * resource" from being a rule anybody has to remember. 07 §1.
 */
export function jsonError(error: unknown, requestId: string): NextResponse {
  const appError = isAppError(error)
    ? error
    : new AppError(ERROR_CODES.INTERNAL, { cause: error });

  const headers: Record<string, string> = { 'X-Request-Id': requestId };

  if (appError.code === ERROR_CODES.RATE_LIMIT_EXCEEDED) {
    const retryAfter = appError.internal?.retryAfter;
    if (typeof retryAfter === 'number') headers['Retry-After'] = String(retryAfter);
  }

  return NextResponse.json(appError.toBody(requestId), {
    status: appError.status,
    headers,
  });
}
