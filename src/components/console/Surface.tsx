import React from 'react';

/**
 * The console's surface vocabulary.
 *
 * Every screen under `/platform` composes from these four, so a change to how
 * a panel is drawn lands everywhere at once rather than in thirteen files.
 *
 * ⚠ WHY THESE ARE NOT `components/presentation/Sheet.tsx`.
 *
 * The tracker's `Panel` is built for a document being read a handful of times
 * in a meeting: generous padding, a coloured neumorphic tone shadow, a title
 * that can wrap. The console is the opposite reading task — someone lives in
 * it for eight hours and scans it — so these are tighter, quieter, and carry
 * their heading in a fixed-height bar that a row of panels can align against.
 *
 * They are also SERVER components with no `'use client'`, which is what lets a
 * console page stay server-rendered while sitting inside the client shell.
 */

/**
 * The page frame. One max-width and one padding rhythm for all thirteen
 * screens, so switching between them never shifts the content edge.
 */
export function ConsolePage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto w-full max-w-[1380px] overflow-x-clip px-5 pt-8 pb-16 md:px-8 md:pt-10 xl:max-w-[1600px] 2xl:max-w-[1760px]"
      style={{
        color: 'var(--text-primary)',
        /* Same inert-utility fix as the mobile sheet: `animate-in fade-in
           slide-in-from-bottom-3` comes from tailwindcss-animate, which this
           project does not install, so every console page was arriving with
           no transition at all while appearing to ask for one. */
        animation: 'slide-up-fade var(--duration-slow) var(--ease-out)',
      }}
    >
      {children}
    </div>
  );
}

import { IconChevronRight } from '@tabler/icons-react';

/**
 * The greeting block at the top of a console screen: a mono eyebrow carrying
 * machine facts (a timestamp, a count, a version) over a serif title.
 *
 * The eyebrow is where the console puts things a person checks rather than
 * reads. Keeping it mono means a timestamp never re-flows the title beside it.
 */
export function ConsoleHeader({
  eyebrow,
  breadcrumbs,
  title,
  actions,
}: {
  eyebrow?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-4 -ml-2.5 flex items-center gap-1.5">
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={i}>
                {bc.href ? (
                  <a
                    href={bc.href}
                    className="rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-widest uppercase transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {bc.label}
                  </a>
                ) : (
                  <span
                    className="rounded-full bg-[rgba(255,255,255,0.03)] px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-widest uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-[rgba(255,255,255,0.02)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {bc.label}
                  </span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <IconChevronRight size={12} stroke={2.5} className="opacity-30" style={{ color: 'var(--text-tertiary)' }} />
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}

        {eyebrow && (
          <p
            className="mb-2 font-mono text-[10.5px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--text-secondary)', opacity: 0.8 }}
          >
            {eyebrow}
          </p>
        )}
        {/* greeting h1 uses display-sm: 24px — editorial but not hero-sized */}
        <h1
          className="display display-md tracking-tight"
          style={{
            color: 'var(--text-primary)',
            textShadow: '0 2px 10px rgba(0,0,0,0.15)',
          }}
        >
          {title}
        </h1>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}

/**
 * A section heading with a rule that fills the space between the title and an
 * optional note.
 *
 * The rule is doing real work: it ties a heading to the full width of the
 * content beneath it, which is what stops a short title from looking
 * unmoored above a wide table. 03 §4a lists the hairline as a hierarchy tool
 * precisely for this.
 */
export function SectionHeading({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-6">
      <div className="flex items-center gap-6">
        <h2
          className="display display-md shrink-0 tracking-tight"
          style={{ color: 'var(--text-primary)', fontWeight: 400 }}
        >
          {title}
        </h2>
        {note ? (
          <span
            className="t-caption hidden shrink-0 whitespace-nowrap md:inline"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.01em' }}
          >
            {note}
          </span>
        ) : null}
      </div>
      <span
        aria-hidden
        className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--border-strong)]/30 to-transparent"
      />
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * The uncarded console section.
 *
 * Replaces the traditional nested white card. It acts as a semantic container
 * and provides a subtle top hairline and optional accent, but leaves the content
 * to breathe on the main surface.
 */
export function Panel({
  title,
  action,
  children,
  flush,
  accent,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  accent?: 'live' | 'warning' | 'danger';
}) {
  const accentInk =
    accent === 'danger'
      ? 'var(--danger-fg)'
      : accent === 'warning'
        ? 'var(--warning-fg)'
        : accent === 'live'
          ? 'var(--blue-500)'
          : undefined;

  return (
    <section className="group relative flex flex-col pt-1">
      {/* Top Hairline Separator */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[var(--border-subtle)] to-transparent"
        aria-hidden
      />
      {title ? (
        <div className="mb-5 mt-4 flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-2.5">
            {accentInk ? (
              <span className="relative flex size-2 shrink-0 items-center justify-center">
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-full opacity-40"
                  style={{ background: accentInk, animationDuration: '3s' }}
                />
                <span
                  aria-hidden
                  className="relative size-1.5 rounded-full"
                  style={{ background: accentInk }}
                />
              </span>
            ) : null}
            <h3
              className="font-mono text-[11.5px] font-medium uppercase tracking-[0.15em]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {title}
            </h3>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={flush ? '' : 'px-1'}>{children}</div>
    </section>
  );
}

/**
 * A sleek, typography-first row for metrics.
 * Drops the pulsing dots in favor of clean layout and premium font weights.
 */
export function FactRow({
  label,
  value,
  dot,
  tone,
  last,
}: {
  label: string;
  value: string;
  dot?: 'ok' | 'warn' | 'bad';
  tone?: 'default' | 'warn';
  last?: boolean;
}) {
  const dotInk =
    dot === 'bad' ? 'var(--danger-fg)' : dot === 'warn' ? 'var(--warning-fg)' : 'var(--success-fg)';

  return (
    <div
      className="flex items-center justify-between gap-4 py-3.5 transition-colors duration-300 hover:bg-[var(--surface-inset)]"
      style={{
        borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
        margin: '0 -12px',
        padding: '14px 12px',
        borderRadius: '8px',
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {dot ? (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: dotInk, boxShadow: `0 0 8px ${dotInk}` }}
          />
        ) : null}
        <span
          className="truncate"
          style={{
            font: '400 13px/1.5 var(--font-ui)',
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
      </div>
      <span
        className="numeric shrink-0 whitespace-nowrap"
        style={{
          font: '500 14px/1 var(--font-mono)',
          color: tone === 'warn' ? 'var(--warning-fg)' : 'var(--text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}


/**
 * The console's one download control. 17 §6.1.
 *
 * ⚠ IT IS AN ANCHOR, NOT A BUTTON, AND THAT IS THE WHOLE REASON IT WORKS.
 *
 * Four screens carried a `<button>` labelled Export that did nothing. Replacing
 * the handler would have meant a client component, a fetch, a blob and an
 * object URL on four otherwise server-rendered pages. A link to a route that
 * answers with `Content-Disposition: attachment` is what a browser already
 * does, needs no JavaScript, and survives middle-click and "save link as".
 *
 * It keeps the button's exact geometry so the row it sits in does not move.
 */
export function ExportLink({
  resource,
  children,
}: {
  resource: 'workspaces' | 'revenue' | 'audit';
  children: React.ReactNode;
}) {
  return (
    <a
      href={`/api/platform/export/${resource}`}
      className="t-compact inline-flex h-[34px] shrink-0 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
      style={{
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-raised)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </a>
  );
}

/**
 * A control whose backing does not exist in Phase 1.
 *
 * ⚠ THE REASON IS ON THE SURFACE, NOT IN A TOOLTIP.
 *
 * 17 §6.4: every control resolves to wired, disabled with a stated reason, or
 * removed. This is the middle one, and the stated reason is the part that
 * makes it acceptable — a greyed-out button with no explanation is a dead
 * control that has also stopped admitting it.
 *
 * `title` carries the reason for a pointer, `aria-describedby` would need an
 * id per instance, so the reason is also rendered as text beside or beneath
 * the control by the caller. This component refuses to be the only carrier.
 */
export function InertControl({
  reason,
  className,
  children,
}: {
  reason: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled
      title={reason}
      className={
        className ??
        't-compact inline-flex h-[34px] shrink-0 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap'
      }
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-sunken)',
        color: 'var(--text-disabled)',
        cursor: 'not-allowed',
      }}
    >
      {children}
    </button>
  );
}
