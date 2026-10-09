/** Resolve the framework's request origin without trusting forwarded hosts or client Origin. */
export function authRequestOrigin(request: Pick<Request, 'url' | 'headers'>): string {
  const url = new URL(request.url);
  const authority = request.headers.get('host');
  // NextURL folds loopback addresses into localhost. Restore only a local authority on the same port.
  if (
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    authority &&
    /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(authority)
  ) {
    try {
      const local = new URL(`${url.protocol}//${authority}`);
      if (local.port === url.port) return local.origin;
    } catch {
      // Malformed authorities retain the framework's origin.
    }
  }
  return url.origin;
}
