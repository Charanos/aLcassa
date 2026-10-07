/** Refuse destructive verification fixtures outside the named loopback database. */
export function assertDisposableDatabase(): void {
  const url = new URL(process.env.DATABASE_URL_ADMIN ?? '');
  if (
    url.hostname !== '127.0.0.1' ||
    url.port !== '55422' ||
    url.pathname !== '/postgres' ||
    (process.env.CACHE_DISABLED !== 'true' && process.env.VERIFICATION_DISPOSABLE !== 'true')
  ) {
    throw new Error('This verification requires the explicitly disposable loopback database.');
  }
}
