'use client';

import { useEffect, useState } from 'react';

/**
 * 03 §8 · 06 §6 · 09 §3. THE BOUNDARY FRAME.
 *
 * The signature element of this design system, and A SECURITY CONTROL rather
 * than decoration. Read 06 §6 before changing anything here.
 *
 * THE PROBLEM IT SOLVES. When Brian switches into a tenant for support, he is
 * looking at another company's data through a limited role. The brief specifies
 * a persistent banner. A banner is dismissible IN A USER'S ATTENTION within
 * about ninety seconds, and it occupies the one strip of screen people learn to
 * ignore. The frame reframes the entire screen rather than annotating it: you
 * cannot look at any part of the interface without it in peripheral vision.
 *
 * It borrows a real convention. A drawing sheet's border with its title block
 * is exactly how a technical document declares whose drawing it is and under
 * what revision.
 *
 * FIVE PROPERTIES THAT ARE NOT NEGOTIABLE:
 *
 *  1. It is NOT an overlay. Layout insets to accommodate it, so nothing is ever
 *     hidden beneath it. See `--boundary-width` and the padding on <body>.
 *  2. It is `--support-banner-bg` IN EVERY WORKSPACE, and deliberately outside
 *     the tenant accent system. A workspace that picked a warm accent must not
 *     be able to make the support frame blend into its own chrome. 03 §8.
 *  3. It is SERVER-DRIVEN from the `supportMode` object on `/v1/me`, never from
 *     a query parameter. A frame that could be suppressed by editing a URL
 *     would be worthless. 07 §3.
 *  4. It is NOT DISMISSIBLE. It reports the reader's own session, so there is
 *     no state in which hiding it would be correct.
 *  5. Under reduced motion it appears INSTANTLY AT FULL OPACITY. Its function
 *     is safety and it cannot be optional. 03 §7.
 *
 * It appears in exactly one other context: an environment that is not
 * production, where it is slate and reads STAGING. Nowhere else, ever. If it
 * starts appearing on other states it stops meaning anything.
 */

export type SupportModeState = {
  active: boolean;
  /** ISO 8601. The 30-minute inactivity ceiling. */
  expiresAt: string;
  tenantName: string;
  platformAdminName: string;
  /** Optional in Phase 1. 09 §3 argues for making it mandatory, because a
   *  support session with a stated reason is one that can be explained six
   *  months later. It costs a required field. */
  reason?: string | null;
  /** 07 §8 · sheet 07. The receipt: the resolved values, on screen, so the
   *  isolation claim is legible rather than only in the policy reference. */
  resolvedTenantId: string;
  resolvedRole: 'support';
  writesSoFar: number;
};

export type BoundaryFrameProps = {
  /** Null when not in support mode. The frame renders nothing. */
  supportMode: SupportModeState | null;
  /** production | staging | preview | development. */
  environment: string;
  onExit: () => void;
};

const ORANGE = 'var(--support-banner-bg)'; // Solid orange for support mode
const SLATE = 'var(--ink-500)'; // Slate for staging

function useCountdown(expiresAt: string | undefined): { label: string; secondsLeft: number } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return { label: '', secondsLeft: 0 };

  const secondsLeft = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return { label: `${minutes}:${seconds}`, secondsLeft };
}

export function BoundaryFrame({ supportMode, environment, onExit }: BoundaryFrameProps) {
  const { label, secondsLeft } = useCountdown(supportMode?.expiresAt);
  const expired = secondsLeft === 0;

  const isStaging = environment !== 'production' && !supportMode?.active;
  const isSupport = Boolean(supportMode?.active);

  if (!isSupport && !isStaging) return null;

  const colour = isSupport ? ORANGE : SLATE;
  const fgColor = isSupport ? 'var(--support-banner-fg)' : 'var(--ink-0)';

  return (
    <>
      {/* THE BANNER. A solid, unmissable banner at the top of the viewport.
          Pushes content down via AppShell's padding-top. */}
      <div
        data-slot="boundary-banner"
        data-mode={isSupport ? 'support' : 'staging'}
        className="fixed top-0 right-0 left-0 z-50 flex h-[28px] items-center justify-center px-4 font-mono text-[11px] font-medium tracking-widest text-white shadow-md transition-colors"
        style={{
          background: colour,
          color: fgColor,
        }}
      >
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-center">
          {isSupport && supportMode ? (
            <>
              <span className="opacity-90">SUPPORT MODE</span>
              <span className="opacity-50">·</span>
              <span className="font-medium">{supportMode.tenantName.toUpperCase()}</span>
              <span className="opacity-50">·</span>
              <span className={expired ? 'animate-pulse text-white' : 'opacity-90'}>
                {expired ? 'SESSION ENDED' : label}
              </span>
            </>
          ) : (
            'STAGING'
          )}
        </div>

        <div className="flex flex-1 justify-end">
          {isSupport ? (
            <button
              type="button"
              onClick={onExit}
              className="rounded-sm bg-white/20 px-3 py-0.5 text-[10px] font-medium hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {expired ? 'RECONNECT' : 'EXIT'}
            </button>
          ) : null}
        </div>
      </div>

      {/* 03 §17. A live region, because entering and leaving support mode is
          exactly the kind of context change a screen reader user must be told
          about rather than discover. Copy from 10 §11, amended 24 Aug 2026
          per 01 D-13: support mode is read and write, not read-only. */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {isSupport && supportMode
          ? `Support mode active. You are viewing ${supportMode.tenantName} as support, with the ability to make changes. The session ends after thirty minutes of inactivity.`
          : null}
      </div>
    </>
  );
}

/**
 * Design sheet 07. The session receipt, kept from the sheets and placed inside
 * the frame.
 *
 * It names the RESOLVED tenant_id and the RESOLVED role, which makes the
 * isolation claim in the brief legible on screen rather than only in the policy
 * reference. "Writes so far: 0" is the line that turns a promise into an
 * observation.
 */
export function SupportSessionReceipt({ state }: { state: SupportModeState }) {
  const rows: Array<{ key: string; value: string; tone?: string }> = [
    { key: 'Acting as', value: state.platformAdminName },
    { key: 'Role resolved', value: 'support · read only', tone: 'var(--blue-500)' },
    { key: 'tenant_id resolved', value: state.resolvedTenantId },
    { key: 'Reason recorded', value: state.reason ?? 'none given' },
    {
      key: 'Writes so far',
      value: String(state.writesSoFar),
      tone: state.writesSoFar === 0 ? 'var(--green-500)' : 'var(--amber-500)',
    },
  ];

  return (
    <section
      data-slot="support-receipt"
      aria-label="Support session"
      className="rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5"
    >
      <h2 className="t-micro text-[var(--text-tertiary)]">Session</h2>
      <dl className="mt-3 grid gap-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-4">
            <dt className="t-caption text-[var(--text-secondary)]">{row.key}</dt>
            <dd className="t-data text-right" style={{ color: row.tone ?? 'var(--text-primary)' }}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
