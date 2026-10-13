import type { NextRequest } from 'next/server';
import { authRequestOrigin } from './requestOrigin';
import { safeReturnPath } from './returnPath';

/** Email signup and resend use the same PKCE callback and bounded return path. */
export function signupConfirmationUrl(request: NextRequest, next = '/app'): string {
  const callback = new URL('/api/v1/auth/callback', authRequestOrigin(request));
  callback.searchParams.set('next', safeReturnPath(next, '/app'));
  return callback.toString();
}
