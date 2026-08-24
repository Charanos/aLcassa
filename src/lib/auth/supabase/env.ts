/**
 * The Supabase environment, read once and validated once.
 *
 * ⚠ THE KEY NAMES CHANGED UNDER US, AND BOTH ARE ACCEPTED HERE.
 *
 * Supabase renamed its API keys in 2025: `anon` became `publishable`, and
 * `service_role` became `secret`. This project's `.env.example` was written
 * against the old names; a project created today issues the new ones. Rather
 * than pick a side and leave the other silently undefined — which fails at
 * runtime with a null-key error that names nothing useful — each accessor
 * reads the new name first and falls back to the old.
 *
 * The failure mode this avoids is specific and nasty: an undefined key does
 * not throw at import time, it throws on the first request, inside Supabase's
 * own code, as "Invalid API key". That is a long way from the missing
 * environment variable that actually caused it.
 */

function required(names: string[], hint: string): string {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim() !== '') return value;
  }
  throw new Error(
    `None of ${names.join(' / ')} is set. ${hint} See README, "Running locally".`,
  );
}

/** Safe in the browser. Public by design — RLS is what protects the data. */
export function supabaseUrl(): string {
  return required(['NEXT_PUBLIC_SUPABASE_URL'], 'Copy .env.example to .env.local and fill it in.');
}

/** Safe in the browser. The publishable (formerly anon) key. */
export function supabasePublishableKey(): string {
  return required(
    ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    'This is the publishable key, safe to expose.',
  );
}

/**
 * ⚠ SERVER ONLY, AND RLS-BYPASSING. Never import this from a client
 * component and never expose it to the browser. See `./admin.ts`, which is
 * the only file permitted to call it.
 */
export function supabaseSecretKey(): string {
  return required(
    ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    'This is the secret key. It bypasses Row Level Security.',
  );
}
