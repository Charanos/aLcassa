/**
 * A service returns a Result rather than throwing, so that a caller cannot
 * forget a failure case: the type will not let a handler read `.value` without
 * first narrowing on `.ok`. Exceptions remain for the genuinely exceptional,
 * where there is nothing sensible for a caller to do.
 */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/** Narrows to the value, throwing on a failure. Tests and seeds only. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(`unwrap called on a failed Result: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}
