'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { FLASH_COOKIE, FLASH_MESSAGES, isFlashKey } from '@/lib/flash';
import { useToast } from './Toast';

/**
 * Reads the flash cookie on arrival, announces it, and burns it.
 *
 * Mounted once beside `ToastProvider` in the root layout, so every door —
 * tenant sign-in, platform sign-in, sign-out, registration — gets the same
 * behaviour without any of them knowing this exists. A route sets the cookie;
 * this shows it. Neither knows about the other beyond the key.
 *
 * ⚠ IT RUNS ON PATHNAME CHANGE, NOT ONLY ON MOUNT. A redirect out of a route
 * handler is a full document load and would be caught either way, but a
 * client-side `router.push` after a server action is not — the provider stays
 * mounted and a mount-only effect would never fire again. Keying on pathname
 * covers both, and burning the cookie immediately is what stops the same
 * notice reappearing on the next navigation.
 *
 * ⚠ THE COOKIE IS DELETED BEFORE THE TOAST IS RAISED. If `toast()` threw, or
 * a re-render ran the effect twice in development's StrictMode, a cookie still
 * sitting there would announce the same thing again. Clearing first makes the
 * read genuinely single-use.
 */
export function FlashToasts() {
  const toast = useToast();
  const pathname = usePathname();

  useEffect(() => {
    const raw = document.cookie
      .split('; ')
      .find((part) => part.startsWith(`${FLASH_COOKIE}=`))
      ?.slice(FLASH_COOKIE.length + 1);

    if (!raw) return;

    /* Burn it first — see the note above. Max-age 0 on the same path the
       route wrote it to; a mismatched path leaves an immortal cookie. */
    document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0; samesite=lax`;

    const key = decodeURIComponent(raw);
    /* A value that is not in the catalogue renders nothing at all, rather
       than rendering itself. The cookie is client-writable by design, so it
       is treated as untrusted input even though the application wrote it. */
    if (!isFlashKey(key)) return;

    const notice = FLASH_MESSAGES[key];
    toast({
      title: notice.title,
      description: 'description' in notice ? notice.description : undefined,
      tone: notice.tone,
    });
  }, [pathname, toast]);

  return null;
}
