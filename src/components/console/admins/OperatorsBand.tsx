import { IconCheck, IconMinus } from '@tabler/icons-react';
import { InitialsTile } from '@/components/primitives/InitialsTile';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';
import { DataSource, SectionHeading } from '../Surface';
import type { Admin } from '@/lib/console/data';
import { ENFORCED, accessLabel } from './access';

/**
 * OPERATORS. Everyone who can see every workspace, one card each.
 *
 * ⚠ THE CARD SAYS WHAT THE PERSON CAN DO, FROM THE RECORD. It used to carry a
 * role chip — `platform_admin` in a monospace pill — drawn from a label the
 * page derived, while the matrix beneath it had columns for three roles, none
 * of which was `platform_admin`. The reader could not place themselves. The
 * card now shows the three capabilities the database stores and the platform
 * enforces, held or not, and a plain-English summary of the combination.
 *
 * ⚠ "MFA UNKNOWN" IS STATED AS A LIMIT OF THIS PAGE, NOT AS A FACT ABOUT THE
 * PERSON. Enrolment lives behind the admin client, which is lint-guarded out of
 * page loads. Grey "unknown" beside a colleague's name reads like a finding
 * about them; "not readable here" says where the gap actually is.
 */
export function OperatorsBand({ admins, live }: { admins: Admin[]; live: boolean }) {
  return (
    <section aria-labelledby="admins-operators">
      <SectionHeading
        id="admins-operators"
        title="Operators"
        note="Everyone who can see every workspace. Short enough to name from memory."
        action={<DataSource kind={live ? 'live' : 'designed'} />}
      />
      {/* `auto-fit`, so a short list fills the row: one operator in a two-column
          grid sat in the left half with nothing beside it, and its own labels
          wrapped for want of the width going spare. */}
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))' }}
      >
        {admins.map((a) => (
          <OperatorCard key={a.id} admin={a} />
        ))}
      </div>
    </section>
  );
}

function OperatorCard({ admin: a }: { admin: Admin }) {
  const access = accessLabel(a.capabilities);
  return (
    <article
      aria-label={a.name}
      className="flex flex-col rounded-card p-6"
      style={{
        background: 'var(--surface-raised)',
        border: `1px solid ${a.you ? 'color-mix(in oklab, var(--blue-500) 35%, var(--border-subtle))' : 'var(--border-subtle)'}`,
        boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
      }}
    >
      <header className="flex items-start gap-4">
        <InitialsTile name={a.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="truncate"
              style={{
                font: '500 var(--type-body)/1.3 var(--font-ui)',
                color: 'var(--text-primary)',
              }}
            >
              {a.name}
            </h3>
            {a.you ? (
              <span
                className="rounded-full px-2 py-0.5 font-mono text-3xs tracking-[0.12em] uppercase"
                style={{ background: 'var(--blue-50)', color: 'var(--blue-600)' }}
              >
                You
              </span>
            ) : null}
          </div>
          <p className="t-caption mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>
            {a.email}
          </p>
        </div>
        <StatusBadge tone={access.tone} size="sm">
          {access.label}
        </StatusBadge>
      </header>

      {/* ── The three enforced capabilities, held or not ─────────────── */}
      <ul className="m-0 mt-6 grid list-none gap-2 p-0 sm:grid-cols-3">
        {ENFORCED.map((c) => {
          const held = a.capabilities[c.key];
          return (
            <li
              key={c.key}
              title={`${c.label} · ${c.column}`}
              className="flex items-center gap-2 rounded-overlay px-3 py-2.5"
              style={{
                background: held ? 'var(--surface-sunken)' : 'transparent',
                border: `1px ${held ? 'solid' : 'dashed'} var(--border-subtle)`,
              }}
            >
              <span
                aria-hidden
                className="grid size-5 shrink-0 place-items-center rounded-full"
                style={{
                  background: held ? 'var(--success-bg)' : 'var(--surface-inset)',
                  color: held ? 'var(--success-fg)' : 'var(--text-disabled)',
                }}
              >
                {held ? <IconCheck size={12} stroke={2.25} /> : <IconMinus size={12} stroke={2} />}
              </span>
              <span
                className="t-compact truncate"
                style={{ color: held ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
              >
                <span className="sr-only">{held ? 'Can' : 'Cannot'} </span>
                {c.short}
              </span>
            </li>
          );
        })}
      </ul>

      {/* ── Activity and record ───────────────────────────────────────── */}
      <dl
        className="m-0 mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-4"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Meta label="Last active" value={a.lastSeen} />
        <Meta label="Sign-ins · 30d" value={String(a.sessions30d)} />
        <Meta label="Granted" value={a.grantedOn} />
        <Meta
          label="Multi-factor"
          value={a.mfa === null ? 'Not readable here' : a.mfa ? 'Enrolled' : 'Not enrolled'}
          tone={a.mfa === null ? 'muted' : a.mfa ? 'success' : 'warning'}
        />
      </dl>
    </article>
  );
}

function Meta({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'muted' | 'success' | 'warning';
}) {
  return (
    <div className="min-w-0">
      <dt
        className="font-mono text-2xs tracking-[0.12em] uppercase"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </dt>
      <dd
        className="t-compact m-0 mt-1 truncate tabular-nums"
        style={{
          color:
            tone === 'muted'
              ? 'var(--text-tertiary)'
              : tone === 'success'
                ? 'var(--success-fg)'
                : tone === 'warning'
                  ? 'var(--warning-fg)'
                  : 'var(--text-primary)',
          fontStyle: tone === 'muted' ? 'italic' : undefined,
        }}
      >
        {value}
      </dd>
    </div>
  );
}

export function OperatorsBandSkeleton() {
  return (
    <SkeletonGroup label="Loading operators" className="block">
      <SkeletonSectionHeading />
      {/* `auto-fit`, so a short list fills the row: one operator in a two-column
          grid sat in the left half with nothing beside it, and its own labels
          wrapped for want of the width going spare. */}
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))' }}
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-card p-6"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-start gap-4">
              <SkeletonBar width={40} height={40} radius="rounded-overlay" />
              <div className="flex-1">
                <SkeletonBar width="46%" height={15} />
                <SkeletonBar width="62%" height={11} className="mt-2" />
              </div>
              <SkeletonBar width={86} height={20} radius="rounded-full" />
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((c) => (
                <SkeletonBar key={c} width="100%" height={40} radius="rounded-overlay" />
              ))}
            </div>
            <div
              className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {[0, 1, 2, 3].map((m) => (
                <div key={m}>
                  <SkeletonBar width="70%" height={10} />
                  <SkeletonBar width="80%" height={13} className="mt-1.5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
