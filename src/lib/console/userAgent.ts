/**
 * A user agent string, reduced to the two facts a person recognises.
 *
 * ⚠ EXTRACTED FROM `liveOperators.ts`, WHICH WAS ITS ONLY HOME AND IS NOW ONE
 * OF TWO CALLERS. 18 §12: the moment a second place needs the same block, the
 * block moves — otherwise the copy drifts, and here the drift would be visible
 * to the operator as a device list and a security email disagreeing about what
 * their own laptop is called.
 *
 * ⚠ NO DIRECTIVE. Both callers are server code today, but the function is pure
 * string work over a string the caller supplies, so nothing about it needs to
 * be server-only — and a `server-only` marker here would be a claim about where
 * it may run rather than about what it touches.
 *
 * Nobody recognises their own user agent string. They recognise "Chrome on
 * macOS", and that is the whole job: enough to tell one of your own devices
 * from a device that is not yours, and nothing more, because a fuller parse
 * would be a fingerprint rendered back at the person it fingerprints.
 */
export function describeAgent(ua: string | null | undefined): string {
  if (!ua) return 'Unknown device';

  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';

  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown OS';

  return `${browser} on ${os}`;
}
