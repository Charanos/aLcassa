'use client';

import { runConsoleMutation } from '@/lib/console/mutation';

import { useState, useTransition } from 'react';
import Link from '@/components/structure/NavigationLink';
import { useRouter } from 'next/navigation';
import {
  IconArrowRight,
  IconClockPlus,
  IconDoorExit,
  IconHistory,
  IconUserExclamation,
} from '@tabler/icons-react';
import { InitialsTile } from '@/components/primitives/InitialsTile';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
import { useToast } from '@/components/primitives/Toast';
import {
  endSupportSessionById,
  extendCurrentSupportSession,
} from '@/app/(platform)/platform/(console)/actions';
import type { SupportVisit } from '@/lib/console/liveSupport';
import { clock, useDeadline } from './useDeadline';
import { minutesLabel, timeOf } from './outcomes';

/* Mirrors the platform module's D2 constants; the server enforces them. */
const BLOCK_MS = 30 * 60 * 1000;
const WINDOW_MS = 5 * 60 * 1000;
const MAX_EXTENSIONS = 2;

/** Shows all open support visits; the server enforces exit authority, extension windows and limits. */
export function OpenSessionsBand({ open }: { open: SupportVisit[] }) {
  return (
    <div className="grid gap-4">
      {open.map((v) => (
        <OpenCard key={v.id} visit={v} />
      ))}
    </div>
  );
}

function OpenCard({ visit: v }: { visit: SupportVisit }) {
  const left = useDeadline(v.endsAt);
  const router = useRouter();
  const pushToast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* `left` is null until mounted (see useDeadline): nothing time-derived is
     decided on the server, so nothing can disagree at hydration. */
  const over = left !== null && left <= 0;
  const urgent = left !== null && !over && left <= WINDOW_MS;
  const extensionsLeft = MAX_EXTENSIONS - v.extensions;
  const canExtend = v.mine && urgent && extensionsLeft > 0;

  function end() {
    setError(null);
    startTransition(async () => {
      const result = await runConsoleMutation(() => endSupportSessionById(v.id), 'Visit ending');
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirm(false);
      pushToast({
        tone: result.ended ? 'success' : 'info',
        title: result.ended
          ? v.mine
            ? `You left ${v.tenantName}`
            : `${v.operatorName}’s visit ended`
          : 'That visit had already ended',
        description: result.ended
          ? 'Recorded in the platform log and in the customer’s own.'
          : 'Nothing was written.',
      });
      router.refresh();
    });
  }

  function extend() {
    startTransition(async () => {
      const result = await runConsoleMutation(
        () => extendCurrentSupportSession(),
        'Visit extension',
      );
      pushToast(
        result.ok
          ? {
              tone: 'attention',
              title: 'Visit extended by thirty minutes',
              description: 'Recorded in the customer’s log.',
            }
          : { tone: 'failure', title: 'Not extended', description: result.error },
      );
      router.refresh();
    });
  }

  return (
    <article
      aria-label={`${v.operatorName} in ${v.tenantName}`}
      className="rounded-card p-5 sm:p-6"
      style={{
        background: 'var(--surface-raised)',
        border: `1px solid ${urgent || over ? 'var(--warning-fg)' : 'color-mix(in oklab, var(--blue-500) 40%, var(--border-subtle))'}`,
        boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
      }}
    >
      <div className="flex flex-wrap items-start gap-4">
        <InitialsTile name={v.operatorName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="t-compact" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {v.mine ? 'You' : v.operatorName}
            </span>{' '}
            {v.mine ? 'are' : 'is'} inside{' '}
            <Link
              href={`/platform/tenants/${v.tenantSlug}`}
              className="underline-offset-2 hover:underline"
              style={{ color: 'var(--text-primary)', fontWeight: 500 }}
            >
              {v.tenantName}
            </Link>{' '}
            since {timeOf(v.startedAt)}
          </p>
          <p
            className="mt-2"
            style={{
              font: '400 var(--type-body)/1.5 var(--font-ui)',
              color: 'var(--text-primary)',
              textWrap: 'pretty',
            }}
          >
            &ldquo;{v.reason}&rdquo;
          </p>
          <p className="t-caption mt-1" style={{ color: 'var(--text-tertiary)' }}>
            The customer reads this reason in their activity log.
          </p>
        </div>
        <div className="text-right">
          <p
            className="tabular-nums"
            style={{
              font: `500 ${urgent ? 'var(--type-panel)' : 'var(--type-lede)'}/1 var(--font-mono)`,
              color: over
                ? 'var(--text-tertiary)'
                : urgent
                  ? 'var(--warning-fg)'
                  : 'var(--text-primary)',
            }}
            aria-label={
              left === null
                ? undefined
                : over
                  ? 'Time is up'
                  : `${Math.ceil(left / 60_000)} minutes left`
            }
          >
            {over ? '00:00' : clock(left)}
          </p>
          <p className="t-caption mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {over ? 'closing' : 'left'}
          </p>
        </div>
      </div>

      {/* Time left in the current block, against the thirty-minute cap. */}
      <div
        className="mt-5 h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--surface-inset)' }}
        aria-hidden
      >
        <span
          className="block h-full rounded-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{
            width: `${left === null ? 100 : Math.min(100, (left / BLOCK_MS) * 100)}%`,
            background: urgent ? 'var(--warning-fg)' : 'var(--blue-500)',
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Stat label="Changes so far" value={String(v.changes)} warn={v.changes > 0} />
        <Stat label="Extensions" value={`${v.extensions} of ${MAX_EXTENSIONS}`} />
        <Stat label="Length so far" value={minutesLabel(v.minutes)} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {v.mine && !over ? (
            <Link
              href="/platform/inside"
              className="t-compact inline-flex h-9 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap"
              style={{
                background: 'var(--blue-500)',
                color: 'var(--text-inverse)',
                fontWeight: 500,
              }}
            >
              Go inside
              <IconArrowRight size={15} stroke={1.5} aria-hidden />
            </Link>
          ) : null}
          {canExtend ? (
            <SecondaryButton onClick={extend} disabled={pending} icon={IconClockPlus}>
              Extend · {extensionsLeft} left
            </SecondaryButton>
          ) : null}
          <SecondaryButton
            onClick={() => (v.mine ? end() : setConfirm(true))}
            disabled={pending}
            icon={IconDoorExit}
          >
            {v.mine ? (pending ? 'Leaving' : 'Leave') : 'End this visit'}
          </SecondaryButton>
        </div>
      </div>
      {error && !confirm ? (
        <p className="t-caption mt-3" role="alert" style={{ color: 'var(--danger-fg)' }}>
          {error}
        </p>
      ) : null}

      <ConsoleDialog
        open={confirm}
        onOpenChange={(n) => !pending && setConfirm(n)}
        dismissible={!pending}
        eyebrow="Support session"
        title={`End ${v.operatorName}’s visit to ${v.tenantName}?`}
        operation="support.exited"
        description="Their session closes on their next request. Use it for a visit left open, or one that should not be happening."
        facts={
          <>
            <DialogFact icon={IconHistory}>
              Both logs record that <em>you</em> ended <em>{v.operatorName}</em>&rsquo;s visit — the
              customer&rsquo;s included.
            </DialogFact>
            <DialogFact icon={IconUserExclamation}>
              {v.changes > 0
                ? `${v.changes} ${v.changes === 1 ? 'change has' : 'changes have'} been made so far. Nothing is undone by ending the visit.`
                : 'Nothing has been changed so far.'}
            </DialogFact>
          </>
        }
        error={error}
        actions={
          <DialogActions
            confirmLabel="End the visit"
            confirmIcon={IconDoorExit}
            onConfirm={end}
            loading={pending}
            tone="destructive"
          />
        }
      />
    </article>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p
        className="font-mono text-2xs tracking-[0.12em] uppercase"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </p>
      <p
        className="t-compact mt-1 tabular-nums"
        style={{ color: warn ? 'var(--warning-fg)' : 'var(--text-primary)', fontWeight: 500 }}
      >
        {value}
      </p>
    </div>
  );
}

function SecondaryButton({
  onClick,
  disabled,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: typeof IconDoorExit;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="t-compact inline-flex h-9 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors enabled:hover:bg-[var(--surface-inset)]"
      style={{
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-raised)',
        color: 'var(--text-primary)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Icon size={15} stroke={1.5} aria-hidden />
      {children}
    </button>
  );
}
