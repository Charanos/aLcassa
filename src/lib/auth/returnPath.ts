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

/** A platform session can resume console pages only, regardless of a previous workspace URL. */
export function platformReturnPath(next: string | null | undefined): string {
  const destination = safeReturnPath(next, '/platform');
  const pathname = new URL(destination, 'https://return-path.invalid').pathname;
  return pathname === '/platform' || pathname.startsWith('/platform/') ? destination : '/platform';
}
