/**
 * A stub for Next's `server-only` marker package, used by vitest alone.
 *
 * The real package exists to make importing a server module from a client
 * component a BUILD failure. Vitest has no such distinction and cannot
 * resolve it, so a test importing any file that starts with
 * `import 'server-only'` fails to load entirely.
 *
 * This file is deliberately empty. The guarantee is not weakened: the marker
 * still throws during `next build`, which is where a client-bundle mistake
 * would actually happen and be caught.
 */
export {};
