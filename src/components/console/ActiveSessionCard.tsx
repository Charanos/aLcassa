'use client';

import { useEffect, useState, useTransition } from 'react';
import type { SupportSession } from '@/lib/console/session';

/**
 * The active-session card on the register.
 *
 * Shares the banner's clock discipline: the countdown is DERIVED from the
 * server's absolute `expiresAt` on every tick rather than decremented, so it
 * survives a refresh, a throttled background tab and a resumed laptop. See
 * `SupportSessionBanner` for the full reasoning.
 *
 * The card is bordered in the accent rather than filled with it. 03 §20 rules
 * out colouring a whole panel to signal state, and here that restraint is also
 * practical: the row beneath carries a person's name and a reason a customer
 * will read, and neither should sit on orange.
 */
export function ActiveSessionCard({
  session,
  onEnd,
}: {
  session: SupportSession;
  onEnd: () => Promise<void>;
}) {
  const [left, setLeft] = useState(() => Math.max(0, Date.parse(session.expiresAt) - Date.now()));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.expiresAt]);

  const total = Math.floor(left / 1000);
  const clock = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

  return (
    <section
      className="mt-5 overflow-hidden rounded-overlay"
      style={{
        border: '1px solid var(--accent-mark)',
        background: 'var(--surface-raised)',
        boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{
          background: 'var(--orange-100)',
          borderBottom: '1px solid var(--accent-mark)',
        }}
      >
        <span
          aria-hidden
          className="size-[7px] shrink-0 rounded-full"
          style={{
            background: 'var(--accent-mark-text)',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }}
        />
        <p className="t-eyebrow" style={{ color: 'var(--accent-mark-text)' }}>
          Active now · 1
        </p>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full"
          style={{
            background: 'var(--blue-50)',
            color: 'var(--blue-500)',
            font: '500 var(--type-compact)/1 var(--font-mono)',
          }}
          aria-hidden
        >
          BM
        </span>
        <span className="min-w-0 flex-1">
          <span className="t-body block" style={{ color: 'var(--text-primary)' }}>
            Brian Masira in <strong>{session.tenantName}</strong>
          </span>
          <span className="t-compact mt-0.5 block" style={{ color: 'var(--text-secondary)' }}>
            {session.reason}
          </span>
        </span>

        <span className="shrink-0 sm:text-right">
          <span
            className="block"
            style={{
              font: '400 var(--type-chip)/1 var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            {left > 0 ? 'Ends in' : 'Expired'}
          </span>
          <span
            className="numeric mt-1.5 block"
            style={{ fontSize: 'var(--display-sm)', color: 'var(--text-primary)' }}
          >
            {clock}
          </span>
        </span>

        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => void onEnd())}
          className="t-compact h-8 shrink-0 rounded-panel px-3.5 whitespace-nowrap transition-colors"
          style={{
            border: '1px solid var(--danger-fg)',
            background: 'var(--surface-raised)',
            color: 'var(--danger-fg)',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? 'Ending…' : 'End now'}
        </button>
      </div>
    </section>
  );
}
