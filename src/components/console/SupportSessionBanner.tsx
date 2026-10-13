'use client';

import { runConsoleMutation } from '@/lib/console/mutation';

import { useTransition } from 'react';
import Link from '@/components/structure/NavigationLink';
import { usePathname, useRouter } from 'next/navigation';
import { IconArrowRight, IconClockPlus, IconShieldLock, IconLogout } from '@tabler/icons-react';
import type { SupportSession } from '@/lib/console/session';
import { extendCurrentSupportSession } from '@/app/(platform)/platform/(console)/actions';
import { useToast } from '@/components/primitives/Toast';
import { clock, useDeadline } from './support/useDeadline';

/* Mirrors SUPPORT_EXTENSION_WINDOW_MS / SUPPORT_MAX_EXTENSIONS in the platform
   module, which cannot be imported into a client bundle. The server enforces
   both; these only decide when the button is offered. */
const EXTENSION_WINDOW_MS = 5 * 60 * 1000;
const MAX_EXTENSIONS = 2;

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

export function SupportSessionBanner({
  session,
  onEnd,
}: {
  session: SupportSession;
  onEnd: () => Promise<void>;
}) {
  /* Null until mounted — see useDeadline for the hydration failure this was. */
  const left = useDeadline(session.expiresAt);
  const [pending, startTransition] = useTransition();
  const [extending, startExtend] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const pushToast = useToast();

  const expired = left !== null && left <= 0;
  /* Under five minutes the clock stops being ambient and starts being a
     warning. It is the same colour as the banner, so this is weight and not
     hue: the figure grows rather than turning red on orange, which would be
     unreadable and is the reason the accent never carries a second accent. */
  const urgent = left !== null && !expired && left <= 5 * 60 * 1000;
  /* Doc 24 · D2. Offered only where the server will accept it: the last five
     minutes, and fewer than two extensions so far. It was never offered at
     all — the action existed and nothing called it. */
  const extensionsLeft = MAX_EXTENSIONS - session.extensions;
  const canExtend = left !== null && !expired && left <= EXTENSION_WINDOW_MS && extensionsLeft > 0;
  const inside = pathname?.startsWith('/platform/inside') ?? false;

  function extend() {
    startExtend(async () => {
      const result = await runConsoleMutation(
        () => extendCurrentSupportSession(),
        'Visit extension',
      );
      if (result.ok) {
        pushToast({
          tone: 'attention',
          title: 'Visit extended by thirty minutes',
          description:
            extensionsLeft - 1 > 0
              ? 'Recorded in the customer’s log. One more extension is possible.'
              : 'Recorded in the customer’s log. That was the last extension; after this, a new session.',
        });
        router.refresh();
      } else {
        pushToast({ tone: 'failure', title: 'Not extended', description: result.error });
      }
    });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
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
        <span className="t-eyebrow hidden sm:inline">Support session</span>
      </span>

      <span className="t-body hidden shrink-0 sm:inline">
        Inside <strong style={{ color: 'inherit' }}>{session.tenantName}</strong>
      </span>

      <span
        aria-hidden
        className="hidden md:block"
        style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.3)' }}
      />

      <span
        className="t-compact hidden min-w-0 flex-1 truncate md:block"
        style={{ color: 'var(--chrome-fg)' }}
        title={session.reason}
      >
        {session.reason}
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-2.5">
        {expired ? (
          <span className="t-compact">Session expired</span>
        ) : (
          <>
            <span className="t-caption hidden sm:inline" style={{ color: 'var(--chrome-fg)' }}>
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
              {clock(left)}
            </span>
          </>
        )}

        {!expired && !inside ? (
          <Link
            href="/platform/inside"
            className="t-compact inline-flex items-center gap-1.5 rounded-panel px-3 transition-colors hover:bg-white/20"
            style={{ height: 28, background: 'rgba(255,255,255,0.12)', color: 'var(--chrome-fg)' }}
          >
            <span className="max-sm:sr-only">Go inside</span>
            <IconArrowRight size={14} stroke={1.5} aria-hidden />
          </Link>
        ) : null}

        {canExtend ? (
          <button
            type="button"
            disabled={extending}
            onClick={extend}
            className="t-compact inline-flex items-center gap-1.5 rounded-panel px-3 transition-colors hover:bg-white/20"
            style={{
              height: 28,
              border: '1px solid rgba(255,255,255,0.55)',
              background: 'rgba(255,255,255,0.12)',
              color: 'var(--chrome-fg)',
              opacity: extending ? 0.7 : 1,
            }}
          >
            <IconClockPlus size={14} stroke={1.5} aria-hidden />
            {extending ? 'Extending' : `Extend · ${extensionsLeft} left`}
          </button>
        ) : null}

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
          {pending ? 'Leaving' : 'Leave'}
        </button>
      </span>
    </div>
  );
}
