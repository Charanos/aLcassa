import type { NextRequest } from 'next/server';
import { AppError, ERROR_CODES } from '@/lib/errors';

/**
 * Reads a request body as `unknown`, from either a JSON post or a form post.
 *
 * ⚠ `unknown`, NOT `any`, AND THAT IS THE ENTIRE POINT OF THIS FILE.
 *
 * `request.json()` is typed `Promise<any>`, so its result flows into any shape
 * a caller claims without a single complaint from the compiler — which is how
 * an unvalidated body ends up three layers deep in a service, and why the
 * lint rule bans the assignment. Returning `unknown` makes the Zod parse at
 * the call site mandatory rather than conventional: there is nothing useful
 * you can do with the value until you have narrowed it.
 *
 * The four public auth routes use this. Every other route gets the same
 * guarantee from `defineRoute`'s `bodySchema`, which parses before the
 * handler runs.
 */
export async function readRequestBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return (await request.json()) as unknown;
    } catch {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        message: 'The request body is not valid JSON.',
      });
    }
  }

  // A form post. `formData()` yields string | File values; the auth routes
  // want strings, and a File where a password was expected fails the schema
  // rather than being coerced into the string "[object File]".
  const form = await request.formData();
  const entries: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    entries[key] = typeof value === 'string' ? value : undefined;
  }
  return entries;
}

/** Does this caller want an envelope, or a redirect? */
export function wantsJson(request: NextRequest): boolean {
  return (request.headers.get('content-type') ?? '').includes('application/json');
}
