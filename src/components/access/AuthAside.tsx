'use client';

import { useEffect, useState } from 'react';
import {
  IconActivity,
  IconBolt,
  IconCheck,
  IconClock,
  IconDatabase,
  IconEye,
  IconEyeOff,
  IconKey,
  IconShieldCheck,
  IconTerminal,
} from '@tabler/icons-react';

/**
 * The animated content of the access aside.
 *
 * ⚠ WHY THIS IS A SEPARATE FILE FROM AuthShell.
 *
 * `'use client'` is contagious downward through a module: putting it at the
 * top of AuthShell turned the FORM column into a client component too, for no
 * reason other than that the aside beside it needed state. Every access form
 * lost server rendering as a side effect of a decorative panel. Splitting the
 * boundary here puts the directive where the interactivity actually is, and
 * AuthShell goes back to being a server component.
 *
 * ⚠ EVERY PANEL BELOW IS HEIGHT-LOCKED, AND THAT IS THE POINT.
 *
 * These panels animate on timers. Any one of them changing height re-sizes
 * the grid row they sit in, which stretches the form column beside them and
 * shifts the form off-centre while someone is typing into it. The audit
 * stream growing from two rows to five, and the credential caption swapping
 * between a one-line and a two-line sentence, were both doing exactly that.
 *
 * So: fixed slot counts, reserved caption heights, and a fixed detail box.
 * Content changes; geometry does not. An aside must never be able to move
 * the thing a person came here to use.
 */

/** Inverted-surface helpers. `color-mix` against the theme's own inverse ink
 *  rather than hardcoded `rgba(255,255,255,…)`, so the platform door tracks
 *  the theme instead of assuming a dark ground. */
const invertFill = (pct: number) => `color-mix(in oklab, var(--ink-inverse) ${pct}%, transparent)`;

/** Honours reduced motion. These panels are ambient, so under `reduce` they
 *  settle on their final state and stop rather than animating slower. */
function useAmbientTicker(periodMs: number, steps: number): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || steps <= 1) {
      setIndex(steps - 1);
      return;
    }

    const id = setInterval(() => setIndex((current) => (current + 1) % steps), periodMs);
    return () => clearInterval(id);
  }, [periodMs, steps]);

  return index;
}

/* ── Postgres RLS query flow ───────────────────────────────────────────── */

const RLS_STEPS = [
  { label: 'Query arrives', detail: 'select * from messages', tone: 'copper' },
  { label: 'Context set', detail: "set_config('app.tenant_id', …)", tone: 'slate' },
  { label: 'Policy runs', detail: 'using (tenant_id = app.current_tenant_id())', tone: 'verdigris' },
  { label: 'Rows returned', detail: 'only this tenant, every time', tone: 'verdigris' },
] as const;

function RlsQueryFlow() {
  const step = useAmbientTicker(2000, RLS_STEPS.length);
  const active = RLS_STEPS[step] ?? RLS_STEPS[0];

  return (
    <Panel
      icon={IconDatabase}
      iconTone="copper"
      title="Postgres row level security"
      badge="Enforced"
      badgeTone="verdigris"
    >
      {/* The track sits BEHIND the nodes rather than beside them, so the
          pipeline reads as one continuous line with stations on it. */}
      <div className="relative mt-1 flex items-center justify-between">
        <span
          aria-hidden
          className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2"
          style={{ background: 'var(--rule-base)' }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 left-3 h-px -translate-y-1/2 transition-[width] duration-500"
          style={{
            background: 'var(--copper-solid)',
            width: `calc((100% - 1.5rem) * ${step / (RLS_STEPS.length - 1)})`,
          }}
        />

        {RLS_STEPS.map((entry, index) => {
          const done = index < step;
          const current = index === step;
          const reached = index <= step;

          return (
            <span
              key={entry.label}
              className="relative grid size-6 place-items-center rounded-full border transition-colors duration-500"
              style={{
                background: reached ? `var(--${entry.tone}-ink)` : 'var(--surface-sunken)',
                borderColor: reached ? `var(--${entry.tone}-ink)` : 'var(--rule-base)',
                color: reached ? 'var(--ink-inverse)' : 'var(--ink-tertiary)',
                boxShadow: current ? `0 0 0 3px var(--${entry.tone}-tint)` : 'none',
              }}
            >
              {done ? (
                <IconCheck size={11} stroke={2} aria-hidden />
              ) : (
                <span className="t-data" style={{ fontSize: '10px' }}>
                  {index + 1}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Height-locked: two lines reserved whether the detail wraps or not. */}
      <div
        className="mt-4 rounded-chip border px-3 py-2"
        style={{
          background: 'var(--surface-sunken)',
          borderColor: 'var(--rule-soft)',
          minHeight: '58px',
        }}
      >
        <p className="t-eyebrow" style={{ color: `var(--${active.tone}-ink)` }}>
          {active.label}
        </p>
        <code className="t-code mt-1 block break-all text-[var(--ink-secondary)]">
          {active.detail}
        </code>
      </div>
    </Panel>
  );
}

/* ── Write-only credentials ────────────────────────────────────────────── */

const SAMPLE_KEY = 'csk_live_8xKjP2mQ9nRtW4vY';
const SAMPLE_HASH = '$argon2id$v=19$m=65536,t=3$…';

function CredentialPanel() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const id = setTimeout(() => setRevealed(false), 6000);
    return () => clearTimeout(id);
  }, [revealed]);

  return (
    <Panel icon={IconKey} iconTone="copper" title="Write-only credentials" badge="argon2id" badgeTone="copper">
      <div
        className="flex items-center gap-2 rounded-chip border px-3 py-2"
        style={{ background: 'var(--surface-sunken)', borderColor: 'var(--rule-soft)' }}
      >
        <code className="t-data flex-1 truncate text-[var(--ink-primary)]">
          {revealed ? SAMPLE_KEY : '••••••••••••••••••••'}
        </code>

        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          aria-label={revealed ? 'Hide the sample key' : 'Reveal the sample key once'}
          className="grid size-7 shrink-0 place-items-center rounded-chip border transition-colors duration-[var(--motion-fade)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--rule-base)',
            color: revealed ? 'var(--verdigris-ink)' : 'var(--copper-ink)',
          }}
        >
          {revealed ? <IconEye size={13} stroke={1.5} /> : <IconEyeOff size={13} stroke={1.5} />}
        </button>
      </div>

      <code className="t-code mt-2 block truncate text-[var(--ink-faint)]">{SAMPLE_HASH}</code>

      {/* Two lines reserved. The copy below swaps between a shorter and a
          longer sentence, and without this the panel changes height mid-read. */}
      <p className="t-caption mt-2 text-[var(--ink-secondary)]" style={{ minHeight: '38px' }}>
        {revealed
          ? 'Hidden again in six seconds. Nobody at the platform can retrieve this value, including support.'
          : 'Shown once, at creation. Hashed immediately and never stored in a form anyone can read back.'}
      </p>
    </Panel>
  );
}

/* ── Immutable audit log ───────────────────────────────────────────────── */

const AUDIT_EVENTS = [
  { action: 'auth.sign_in', time: 'just now', ok: true },
  { action: 'support.session_opened', time: '12s ago', ok: true },
  { action: 'credential.reveal_denied', time: '1m ago', ok: false },
  { action: 'member.invited', time: '4m ago', ok: true },
] as const;

function AuditStream() {
  const revealed = useAmbientTicker(2200, AUDIT_EVENTS.length);

  return (
    <Panel icon={IconActivity} iconTone="slate" title="Immutable activity log" badge="Live" badgeTone="slate" pulse>
      {/* ⚠ EVERY ROW IS ALWAYS RENDERED. Only opacity changes.
          The previous version sliced the array, so the panel grew from two
          rows to five and back, resizing the aside on a 2.2 second loop. */}
      <ol className="grid gap-1.5">
        {AUDIT_EVENTS.map((event, index) => (
          <li
            key={event.action}
            className="flex items-center gap-2.5 transition-opacity duration-700"
            style={{ opacity: index <= revealed ? 1 - index * 0.16 : 0.12 }}
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: event.ok ? 'var(--verdigris-solid)' : 'var(--oxide-solid)' }}
            />
            <code className="t-code flex-1 truncate text-[var(--ink-secondary)]">{event.action}</code>
            <span className="t-caption shrink-0 text-[var(--ink-faint)]">{event.time}</span>
          </li>
        ))}
      </ol>

      <p className="t-caption mt-3 text-[var(--ink-secondary)]">
        Support can add to this log. Nobody can edit or remove from it.
      </p>
    </Panel>
  );
}

/* ── Shared panel chrome ───────────────────────────────────────────────── */

function Panel({
  icon: Icon,
  iconTone,
  title,
  badge,
  badgeTone,
  pulse = false,
  children,
}: {
  icon: typeof IconKey;
  iconTone: string;
  title: string;
  badge: string;
  badgeTone: string;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-panel border p-4"
      style={{
        background: 'var(--surface-raised)',
        borderColor: 'var(--rule-soft)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} stroke={1.5} aria-hidden style={{ color: `var(--${iconTone}-ink)` }} />
        <span className="t-eyebrow text-[var(--ink-tertiary)]">{title}</span>
        <span
          className="t-chip ml-auto inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5"
          style={{ background: `var(--${badgeTone}-tint)`, color: `var(--${badgeTone}-ink)` }}
        >
          {pulse ? (
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: `var(--${badgeTone}-solid)` }}
            />
          ) : null}
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ── The two doors ─────────────────────────────────────────────────────── */

export function TenantAside() {
  return (
    <div className="grid gap-5">
      <div>
        <p className="t-lede text-[var(--ink-primary)]">
          Isolated by the database,
          <br />
          not by the application.
        </p>
        <p className="t-compact mt-2 text-[var(--ink-secondary)]" style={{ maxWidth: '44ch' }}>
          Every workspace sits behind a policy enforced by Postgres itself. An application bug
          cannot cross a tenant boundary, because the application is not what is holding the line.
        </p>
      </div>

      <RlsQueryFlow />
      <CredentialPanel />
      <AuditStream />
    </div>
  );
}

const PLATFORM_STATS = [
  { label: 'Workspaces', value: '—', icon: IconBolt },
  { label: 'Master rules', value: '—', icon: IconTerminal },
  { label: 'Open sessions', value: '0', icon: IconClock },
  { label: 'Isolation gate', value: 'Passing', icon: IconShieldCheck },
] as const;

export function PlatformAside() {
  return (
    <div className="grid gap-5">
      <div>
        <p className="t-lede" style={{ color: 'var(--ink-inverse)' }}>
          This account manages every workspace.
        </p>
        <p
          className="t-compact mt-2"
          style={{ color: 'var(--ink-inverse)', opacity: 0.72, maxWidth: '44ch' }}
        >
          Provisioning, entitlements and master assistant rules. Every action is written to an
          audit trail that cannot be edited afterwards, including by you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {PLATFORM_STATS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-panel border p-3"
            style={{ background: invertFill(5), borderColor: invertFill(12) }}
          >
            <div className="flex items-center gap-1.5">
              <Icon size={12} stroke={1.5} aria-hidden style={{ color: 'var(--copper-ink)' }} />
              <span
                className="t-eyebrow"
                style={{ color: 'var(--ink-inverse)', opacity: 0.55 }}
              >
                {label}
              </span>
            </div>
            <span className="t-data mt-1.5 block" style={{ color: 'var(--ink-inverse)' }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div
        className="rounded-panel border p-4"
        style={{ background: invertFill(6), borderColor: invertFill(14) }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconTerminal size={14} stroke={1.5} aria-hidden style={{ color: 'var(--copper-ink)' }} />
            <span className="t-compact" style={{ color: 'var(--ink-inverse)' }}>
              Stepping in is recorded
            </span>
          </div>
          <span
            className="t-chip rounded-chip px-2 py-0.5"
            style={{ background: 'var(--copper-tint)', color: 'var(--copper-ink)' }}
          >
            Logged
          </span>
        </div>
        <p
          className="t-caption mt-2"
          style={{ color: 'var(--ink-inverse)', opacity: 0.68 }}
        >
          Every support session you open into a workspace is written to that workspace&rsquo;s own
          activity log, where its owner can see it and end it. You cannot redact that entry.
        </p>
      </div>
    </div>
  );
}
