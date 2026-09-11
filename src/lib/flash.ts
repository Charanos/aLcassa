/**
 * Flash notices — a toast that survives a redirect.
 *
 * ⚠ THIS IS WHY SIGN-IN AND SIGN-OUT NEVER HAD ONE, AND IT WAS NOT AN
 * OVERSIGHT ABOUT TOASTS. It was a consequence of how those routes work.
 *
 * Both are plain `<form method="post">` submissions answered with a 303 —
 * deliberately, so the doors keep working without JavaScript (see the note on
 * `/sign-in`). A 303 throws the page away. `useToast()` lives in React state
 * inside `ToastProvider`, and React state does not survive a full document
 * navigation, so there was simply no way for the route to hand a message to
 * the page it was sending the reader to. Nobody forgot; the seam was missing.
 *
 * This is that seam: the route sets a tiny, single-use cookie, the next
 * document read announces it and deletes it.
 *
 * ⚠ IT IS DELIBERATELY NOT `httpOnly`. Every other cookie this application
 * sets is, and should be. This one has to be readable by `document.cookie` so
 * the client can show it and clear it in the same tick, with no round trip and
 * no `?toast=` in the URL for the reader to bookmark or share. What it carries
 * is a tone and a sentence the application wrote — no identifier, no token,
 * nothing derived from the session — so read access buys an attacker the
 * ability to learn that somebody signed in on their own machine.
 *
 * ⚠ AND IT IS NEVER RENDERED AS HTML. `FlashToasts` looks the key up in a
 * closed catalogue below and renders the matching literal. A tampered cookie
 * value matches nothing and shows nothing — the same discipline `?error=` uses
 * on the auth pages.
 */

export const FLASH_COOKIE = 'aLcassa_flash';

/** The closed set. Adding a notice means adding a key here, which is what
 *  keeps a cookie value from ever becoming arbitrary text on screen. */
export const FLASH_MESSAGES = {
  signed_in: {
    tone: 'success',
    title: 'Signed in',
    description: 'Welcome back.',
  },
  signed_out: {
    tone: 'info',
    title: 'Signed out',
    description: 'Your session on this device has ended.',
  },
  workspace_created: {
    tone: 'success',
    title: 'Workspace created',
    description: 'You are the owner. Confirm your email when it arrives.',
  },
  /* NOTE: password reset deliberately has no entry here. It redirects to
     `/sign-in?reset=1`, where the page renders a persistent `role="status"`
     banner saying every other session was revoked. That outlives a toast, and
     it is still on screen while the reader retypes their new password — which
     is exactly when they need to read it. */
} as const satisfies Record<
  string,
  { tone: 'info' | 'success' | 'attention' | 'failure'; title: string; description?: string }
>;

export type FlashKey = keyof typeof FLASH_MESSAGES;

export function isFlashKey(value: string): value is FlashKey {
  return Object.hasOwn(FLASH_MESSAGES, value);
}

/**
 * Cookie options for a flash. Short-lived by design: it exists to survive one
 * redirect, and a stale one announcing "Signed in" an hour later would be
 * worse than none at all. `sameSite: 'lax'` so it rides a top-level redirect;
 * `path: '/'` because sign-out lands on a different tree than sign-in.
 */
export const FLASH_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: false,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30,
} as const;
