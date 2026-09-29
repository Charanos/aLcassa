'use client';

import { useEffect, useState, useTransition } from 'react';
import { IconShieldLock, IconLogout } from '@tabler/icons-react';
import type { SupportSession } from '@/lib/console/session';

/**
 * The support-mode banner. 09 §4 · 03 §8.
 *
 * "If a user can forget they are in support mode, the component has failed."
 * That single sentence decides every choice here: it is the first element in
 * the document, it is opaque rather than glass, it is the one place the raw
 * warning colour is allowed to fill a full-bleed surface, and it cannot be
 * dismissed — only exited.
 *
 * ⚠ THE CLOCK IS DERIVED, NOT COUNTED.
 *
 * The design file decrements `secondsLeft` on an interval. This recomputes
 * from the server's absolute `expiresAt` on every tick instead, which is the
 * difference between a timer and a deadline:
 *
 *   · a refresh does not reset it
 *   · a backgrounded tab, where browsers throttle intervals to once a minute,
 *     shows the true remaining time on return rather than a drifted one
 *   · a laptop resumed from sleep resolves instantly instead of counting down
 *     from wherever it was suspended
 *
 * When it reaches zero the component stops rendering a countdown and says so.
 * It does NOT quietly disappear: the session ending is information, and a
 * banner that vanishes looks identical to a banner that never appeared.
 */

function remainingMs(expiresAt: string): number {
  return Math.max(0, Date.parse(expiresAt) - Date.now());
}

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SupportSessionBanner({
  session,
  onEnd,
}: {
  session: SupportSession;
  onEnd: () => Promise<void>;
}) {
  const [left, setLeft] = useState(() => remainingMs(session.expiresAt));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLeft(remainingMs(session.expiresAt));
    const id = setInterval(() => setLeft(remainingMs(session.expiresAt)), 1000);
    return () => clearInterval(id);
  }, [session.expiresAt]);

  const expired = left <= 0;
  /* Under five minutes the clock stops being ambient and starts being a
     warning. It is the same colour as the banner, so this is weight and not
     hue: the figure grows rather than turning red on orange, which would be
     unreadable and is the reason the accent never carries a second accent. */
  const urgent = !expired && left <= 5 * 60 * 1000;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-5)',
        padding: '0 var(--space-4) 0 var(--space-5)',
        minHeight: 44,
        /* --orange-500, not --orange-400. The banner carries white text, and
           the brand value at 400 measures 3.30:1 under white — a fail. 500 is
           4.74:1. 03 §4 draws this line explicitly and the support banner is
           the component it names. */
        background: 'var(--orange-500)',
        color: 'var(--chrome-fg)',
        animation: 'banner-in var(--duration-base) var(--ease-standard)',
      }}
    >
      <span className="inline-flex shrink-0 items-center gap-2">
        <IconShieldLock size={16} stroke={1.5} aria-hidden />
        <span className="t-eyebrow">Support session</span>
      </span>

      <span className="t-body hidden shrink-0 sm:inline">
        Read-only in <strong style={{ color: 'inherit' }}>{session.tenantName}</strong>
      </span>

      <span
        aria-hidden
        className="hidden md:block"
        style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.3)' }}
      />

      <span
        className="t-compact hidden min-w-0 flex-1 truncate md:block"
        style={{ color: 'rgba(255,255,255,0.86)' }}
        title={session.reason}
      >
        {session.reason}
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-2.5">
        {expired ? (
          <span className="t-compact">Session expired</span>
        ) : (
          <>
            <span className="t-caption hidden sm:inline" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Ends in
            </span>
            <span
              className="numeric"
              style={{
                fontSize: urgent ? 'var(--type-lede)' : 'var(--type-body)',
                fontWeight: 500,
                letterSpacing: '0.02em',
                transition: 'font-size var(--duration-base) var(--ease-standard)',
              }}
            >
              {format(left)}
            </span>
          </>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => void onEnd())}
          className="t-compact inline-flex items-center gap-1.5 rounded-panel px-3 transition-colors"
          style={{
            height: 28,
            border: '1px solid rgba(255,255,255,0.55)',
            background: 'rgba(255,255,255,0.12)',
            color: 'var(--chrome-fg)',
            opacity: pending ? 0.7 : 1,
          }}
        >
          <IconLogout size={14} stroke={1.5} aria-hidden />
          {pending ? 'Exiting' : 'Exit session'}
        </button>
      </span>
    </div>
  );
}
