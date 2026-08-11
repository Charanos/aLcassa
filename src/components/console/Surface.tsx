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
      className="relative mx-auto w-full max-w-[1380px] overflow-x-clip px-5 pt-8 pb-16 md:px-8 md:pt-10 animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out"
      style={{ color: 'var(--text-primary)' }}
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8 mb-7">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 mb-2.5 t-caption" style={{ color: 'var(--text-tertiary)' }}>
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={i}>
                {bc.href ? (
                  <a href={bc.href} className="hover:text-[var(--text-primary)] transition-colors">
                    {bc.label}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>{bc.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <IconChevronRight size={13} className="opacity-40" />}
              </React.Fragment>
            ))}
          </nav>
        ) : null}
        
        {eyebrow && (
          <p className="t-eyebrow mb-2 tracking-widest uppercase opacity-75" style={{ color: 'var(--text-tertiary)' }}>
            {eyebrow}
          </p>
        )}
        {/* greeting h1 uses display-sm: 24px — editorial but not hero-sized */}
        <h1
          className="display display-md tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
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
    <div className="mb-4 flex items-center gap-4">
      <h2
        className="display display-sm shrink-0 tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h2>
      <span
        aria-hidden
        className="h-px flex-1 bg-gradient-to-r from-[var(--border-strong)]/60 to-transparent"
      />
      {note ? (
        <span
          className="t-caption hidden shrink-0 whitespace-nowrap md:inline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {note}
        </span>
      ) : null}
      {action}
    </div>
  );
}

/**
 * The console card.
 *
 * 03 §7 puts elevation on borders first and shadow second, so this is a
 * hairline plus the lightest glass highlight — enough to lift off the cream,
 * not enough to notice. `flush` drops the body padding for panels whose
 * content is a list or a table that should meet the edges.
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
  /** A hue for the header bar. Used sparingly — a live session, a failure. */
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
    <section
      className="overflow-hidden rounded-2xl transition-all duration-300 hover:border-[var(--blue-400)]/30 hover:shadow-lg"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-raised)',
        boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
      }}
    >
      {title ? (
        <div
          className="flex items-center gap-3 px-5 py-3.5"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            background: accent ? 'var(--surface-sunken)' : undefined,
          }}
        >
          {accentInk ? (
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full"
              style={{
                background: accentInk,
                animation: accent === 'live' ? 'pulse-dot 2s ease-in-out infinite' : undefined,
              }}
            />
          ) : null}
          <p className="t-eyebrow flex-1 tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            {title}
          </p>
          {action}
        </div>
      ) : null}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

/**
 * A key/value row inside a panel. The value is mono and right-aligned so a
 * column of them can be compared down its right edge, which is the entire
 * reason 03 §6 puts numerics in JetBrains Mono.
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
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: last ? undefined : '1px solid var(--border-subtle)' }}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: dotInk }}
        />
      ) : null}
      <span
        className="t-compact min-w-0 flex-1"
        style={{ color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}
      >
        {label}
      </span>
      <span
        className="numeric shrink-0 whitespace-nowrap"
        style={{
          fontSize: 'var(--text-sm)',
          color: tone === 'warn' ? 'var(--warning-fg)' : 'var(--text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
