'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconClock, IconDoorExit, IconMessage, IconPencil } from '@tabler/icons-react';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
import { endSupportVisit } from '@/app/(tenant)/app/actions';

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
  /** The session row, so the customer can end exactly this visit. */
  sessionId: string;
  /** Owners and admins may end a visit (doc 24 · D6); the server re-checks. */
  canEnd: boolean;
  /** ISO 8601. An absolute thirty-minute cap from entry, not an idle timer. */
  expiresAt: string;
  tenantName: string;
  /** The operator's name, written into the session when it opened. */
  platformAdminName: string;
  /** Required since 01 D-13. The operator wrote it for this customer. */
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
};

const ORANGE = 'var(--support-banner-bg)'; // Solid orange for support mode
const SLATE = 'var(--ink-500)'; // Slate for staging

function useCountdown(expiresAt: string | undefined): { label: string; secondsLeft: number } {
  /* Null until mounted: a clock rendered on the server disagrees with the
     browser by the second it took to arrive, and React tears the tree down on
     the mismatch. The console banner failed exactly this way (doc 24). */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return { label: '', secondsLeft: 0 };
  if (now === null) return { label: '--:--', secondsLeft: Number.POSITIVE_INFINITY };

  const secondsLeft = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return { label: `${minutes}:${seconds}`, secondsLeft };
}

/**
 * ⚠ IT WAS WRITTEN FOR THE WRONG READER. Doc 24 · S0.3 · S0.4.
 *
 * The operator never sees this frame — the console has its own banner. The
 * CUSTOMER does, and it spoke to them as though they were the operator: an
 * EXIT / RECONNECT button (wired to a no-op, so nobody could end anything),
 * the operator named by UUID, a screen-reader line telling them "you are
 * viewing this workspace as support", and "thirty minutes of inactivity" for
 * a cap that is absolute. It now says who is inside, why, for how long and
 * what they have changed, and — for the owners and admins the database lets
 * end a visit — offers the ending, with a confirmation.
 */
export function BoundaryFrame({ supportMode, environment }: BoundaryFrameProps) {
  const { label, secondsLeft } = useCountdown(supportMode?.expiresAt);
  const expired = secondsLeft === 0;
  const [open, setOpen] = useState(false);

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
        className="fixed top-0 right-0 left-0 z-50 flex h-[28px] items-center justify-center gap-3 px-4 font-mono text-xs font-medium tracking-widest text-white shadow-md transition-colors"
        style={{ background: colour, color: fgColor }}
      >
        <div className="hidden flex-1 sm:block" />
        <div className="flex min-w-0 items-center gap-2 text-center">
          {isSupport && supportMode ? (
            <>
              <span className="hidden opacity-90 sm:inline">ALCASSA SUPPORT</span>
              <span className="hidden opacity-50 sm:inline">·</span>
              <span className="truncate font-medium">
                {supportMode.platformAdminName.toUpperCase()} IS IN YOUR WORKSPACE
              </span>
              <span className="opacity-50">·</span>
              <span className="opacity-90">{expired ? 'ENDED' : label}</span>
            </>
          ) : (
            'STAGING'
          )}
        </div>

        <div className="flex flex-1 justify-end">
          {isSupport && supportMode && !expired ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-chip bg-white/20 px-3 py-0.5 text-2xs font-medium hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {supportMode.canEnd ? 'DETAILS · END' : 'DETAILS'}
            </button>
          ) : null}
        </div>
      </div>

      {/* 03 §17. Entering and leaving is a context change a screen reader user
          must be told about. Written for the customer, who is the reader. */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {isSupport && supportMode
          ? `${supportMode.platformAdminName} from aLcassa support is in your workspace${supportMode.reason ? `: ${supportMode.reason}` : ''}. The visit ends within thirty minutes, and everything done is recorded in your activity log.`
          : null}
      </div>

      {isSupport && supportMode && open ? (
        <VisitDialog state={supportMode} left={label} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function VisitDialog({
  state,
  left,
  onClose,
}: {
  state: SupportModeState;
  left: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function end() {
    setError(null);
    startTransition(async () => {
      const result = await endSupportVisit(state.sessionId);
      if (result.ok) {
        setDone(result.notice ?? 'The visit is over.');
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <ConsoleDialog
      open
      onOpenChange={(n) => {
        if (!n && !pending) onClose();
      }}
      dismissible={!pending}
      eyebrow="Support visit"
      title={done ? 'Visit ended' : `${state.platformAdminName} is in ${state.tenantName}`}
      description={
        done ??
        'Our support team opened your workspace to help with a request. They work under the same access rules as your own staff.'
      }
      facts={
        done ? undefined : (
          <>
            <DialogFact icon={IconMessage}>
              {state.reason ? <>&ldquo;{state.reason}&rdquo;</> : 'No reason was recorded.'}
            </DialogFact>
            <DialogFact icon={IconClock}>
              <em>{left}</em> left. A visit ends at thirty minutes and can be extended twice, each
              time recorded in your activity log.
            </DialogFact>
            <DialogFact icon={IconPencil} tone={state.writesSoFar > 0 ? 'warning' : 'neutral'}>
              {state.writesSoFar === 0
                ? 'Nothing has been changed so far.'
                : `${state.writesSoFar} ${state.writesSoFar === 1 ? 'change has' : 'changes have'} been made so far — each one is in your activity log.`}
            </DialogFact>
          </>
        )
      }
      error={error}
      actions={
        !done && state.canEnd ? (
          <DialogActions
            cancelLabel="Keep the visit open"
            confirmLabel="End this visit"
            confirmIcon={IconDoorExit}
            onConfirm={end}
            loading={pending}
            tone="destructive"
          />
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="t-compact h-9 rounded-panel px-3.5"
            style={{
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
            }}
          >
            Close
          </button>
        )
      }
    >
      {done ? null : (
        <div className="grid gap-2">
          {!state.canEnd ? (
            <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
              An owner or admin of this workspace can end the visit.
            </p>
          ) : null}
          <a
            href="/app/settings/audit"
            className="t-caption underline-offset-2 hover:underline"
            style={{ color: 'var(--text-action)' }}
          >
            Open your activity log
          </a>
        </div>
      )}
    </ConsoleDialog>
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
    /* Read and write since 01 D-13. It said "read only". */
    { key: 'Role resolved', value: 'support · read and write', tone: 'var(--blue-500)' },
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
