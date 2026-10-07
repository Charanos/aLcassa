/** Keep post-authentication navigation on this application, including URL-parser edge cases. */
export function safeReturnPath(next: string | null | undefined, fallback: string): string {
  if (!next?.startsWith('/') || next.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(next)) {
    return fallback;
  }
  const origin = 'https://return-path.invalid';
  try {
    const resolved = new URL(next, origin);
    return resolved.origin === origin
      ? `${resolved.pathname}${resolved.search}${resolved.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
