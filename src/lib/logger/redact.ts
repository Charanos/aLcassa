/**
 * 04 §7 · 05 I-16 · 06 §9.
 *
 * Redaction happens BEFORE storage, not at query time on a log viewer. The
 * person is not in the log at all.
 *
 * Two categories, and the difference matters:
 *
 *   SECRETS belong to the platform or a tenant. A leaked one is an incident we
 *   can remediate by rotating.
 *
 *   PERSONAL DATA on the customer records seam belongs to a tenant's customers,
 *   two steps removed from us. A leaked one cannot be un-leaked, and under the
 *   Kenyan Data Protection Act 2019 it is a processor breach. 01 D-09.
 *
 * The redacted form keeps the shape and drops the content, so a request is
 * still debuggable from its log line: `"[redacted str:13]"` tells you a name of
 * thirteen characters was present without telling you whose.
 */

/** Never appears in a log, in any form, at any nesting depth. */
const SECRET_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'secret',
  'keyhash',
  'key_hash',
  'token',
  'tokenhash',
  'token_hash',
  'authorization',
  'cookie',
  'setcookie',
  'set-cookie',
  'apikey',
  'api_key',
  'servicerolekey',
  'service_role_key',
  'accesstoken',
  'refreshtoken',
  'credentialsref',
  'credentials_ref',
]);

/**
 * Customer record fields, from 05 §8. This list and the columns marked
 * `REDACTED IN LOGS` in the schema are the same list, and the log-scanning test
 * in 11 §5 seeds a known value into each one and fails if it ever appears in
 * generated output.
 */
const PERSONAL_KEYS = new Set([
  'contacthandle',
  'contact_handle',
  'displayname',
  'display_name',
  'summary',
  'preferences',
  'keyfacts',
  'key_facts',
  'phone',
  'email',
  'handle',
  'sender',
  'text',
  'name',
  'fullname',
  'full_name',
]);

const E164 = /^\+?[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_DEPTH = 8;

function describe(value: unknown): string {
  if (typeof value === 'string') {
    if (E164.test(value)) return '[redacted e164]';
    if (EMAIL.test(value)) return '[redacted email]';
    return `[redacted str:${value.length}]`;
  }
  if (typeof value === 'number') return '[redacted num]';
  if (Array.isArray(value)) return `[redacted arr:${value.length}]`;
  if (value && typeof value === 'object') {
    return `[redacted obj:${Object.keys(value).length}]`;
  }
  return '[redacted]';
}

export function redact(input: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[redacted depth]';
  if (input === null || input === undefined) return input;

  if (Array.isArray(input)) {
    return input.map((item) => redact(item, depth + 1));
  }

  if (input instanceof Error) {
    return { name: input.name, message: input.message, stack: input.stack };
  }

  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const normalised = key.toLowerCase().replace(/[-_\s]/g, '');
      if (SECRET_KEYS.has(normalised) || SECRET_KEYS.has(key.toLowerCase())) {
        out[key] = '[redacted]';
      } else if (PERSONAL_KEYS.has(normalised) || PERSONAL_KEYS.has(key.toLowerCase())) {
        out[key] = describe(value);
      } else {
        out[key] = redact(value, depth + 1);
      }
    }
    return out;
  }

  // A bare string that looks like a credential is redacted wherever it appears,
  // because the commonest way a key reaches a log is inside a message rather
  // than under a named field.
  if (typeof input === 'string' && /\b(?:c?sk)_(?:live|test)_[A-Za-z0-9_-]+/.test(input)) {
    return input.replace(/\b((?:c?sk)_(?:live|test)_)[A-Za-z0-9_-]+/g, '$1[redacted]');
  }

  return input;
}

/** Exported for the log-scanning test in 11 §5. */
export const REDACTION_KEYS = {
  secret: [...SECRET_KEYS],
  personal: [...PERSONAL_KEYS],
} as const;
