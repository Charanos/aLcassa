import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';
import { PlatformAside, TenantAside } from './AuthAside';

export { PlatformAside, TenantAside };

/**
 * Design sheet 08 · Access. The shell every access screen sits in.
 *
 * ⚠ THIS IS A SERVER COMPONENT AGAIN, DELIBERATELY. The animated panels in the
 * aside need state, so a `'use client'` directive had been added here, at the
 * top of the shell. That directive is contagious downward: it turned the FORM
 * column into a client component too, so every access form lost server
 * rendering as a side effect of a decorative panel beside it. The boundary now
 * lives in `AuthAside.tsx`, where the interactivity actually is.
 *
 * ⚠ THE ASIDE CANNOT AFFECT THE FORM'S LAYOUT, AND THAT IS ENFORCED HERE.
 *
 * The two columns previously shared a grid row whose height was set by
 * whichever column was taller. The aside animates: its audit stream grew from
 * two rows to five, its credential caption swapped between a one-line and a
 * two-line sentence. Each change resized the row, which stretched the form
 * column and shifted the form vertically while somebody was typing into it.
 *
 * Two independent mechanisms now prevent that, because one would be a
 * coincidence rather than a guarantee:
 *
 *   1. The aside is `sticky` at exactly `100dvh` with `align-self: start`, so
 *      it contributes a FIXED height to the row no matter what it contains.
 *      It scrolls internally if its content ever exceeds the viewport.
 *   2. The panels inside it are individually height-locked, in AuthAside.tsx.
 *
 * The form column keeps its own `min-h-dvh` and centres within itself, so its
 * geometry is a function of the form alone.
 *
 * Below `lg` the aside is not rendered at all: on a phone the form is the
 * whole job, and a decorative column would be a screenful to scroll past.
 *
 * The platform variant inverts the aside, the same structural signal the
 * console header uses in 03 §4: which door you are at is legible before you
 * have read a word. There is deliberately no navigational path between the
 * two. 02 §3.
 */
export function AuthShell({
  eyebrow,
  title,
  lede,
  children,
  footer,
  variant = 'tenant',
  aside,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'tenant' | 'platform';
  aside?: React.ReactNode;
}) {
  const platform = variant === 'platform';

  return (
    <div className="grid min-h-dvh items-start lg:grid-cols-[1fr_minmax(480px,46%)]">
      {/* ── The form. First in the DOM so a keyboard or screen reader user
             reaches what they came for without traversing the aside. ─────── */}
      <main
        id="main"
        className="order-1 flex min-h-dvh flex-col justify-center px-6 py-12 md:px-12 lg:px-16"
        style={{ background: 'var(--surface-page)' }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: '420px' }}>
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2.5 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] lg:hidden"
          >
            <Mark size={22} />
            <span className="t-chip text-[var(--ink-primary)]">Conduit</span>
          </Link>

          {eyebrow ? (
            <div className="mb-3 flex items-center gap-2.5">
              <span
                aria-hidden
                className="block h-px w-6"
                style={{ background: platform ? 'var(--slate-rule)' : 'var(--copper-rule)' }}
              />
              <span
                className="t-eyebrow"
                style={{ color: platform ? 'var(--slate-ink)' : 'var(--copper-ink)' }}
              >
                {eyebrow}
              </span>
            </div>
          ) : null}

          <h1 className="t-title text-[var(--ink-primary)]">{title}</h1>

          {lede ? (
            <p className="t-body mt-3 text-[var(--ink-secondary)]" style={{ maxWidth: '42ch' }}>
              {lede}
            </p>
          ) : null}

          <div className="mt-8">{children}</div>

          {footer ? (
            <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--rule-soft)' }}>
              {footer}
            </div>
          ) : null}
        </div>
      </main>

      {/* ── The aside. Height-locked to the viewport, sticky, internally
             scrollable. Nothing it does can reach the column beside it. ──── */}
      <aside
        aria-label="About this platform"
        className="relative order-2 hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto"
        style={{
          background: platform ? 'var(--surface-invert)' : 'var(--surface-sunken)',
          borderLeft: '1px solid var(--rule-soft)',
        }}
      >
        {/* The drafting-sheet ground: a measured dot grid rather than a
            gradient. Fixed to the aside, so it does not scroll with content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--rule-base) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            opacity: platform ? 0.12 : 0.4,
          }}
        />

        <div className="relative z-10 flex min-h-full flex-col justify-between gap-10 p-10 xl:p-12">
          <div>
            <div className="flex items-start justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <Mark size={26} tone={platform ? 'inverse' : 'copper'} />
                <span className="grid gap-1">
                  <span
                    className="t-panel leading-none"
                    style={{ color: platform ? 'var(--ink-inverse)' : 'var(--ink-primary)' }}
                  >
                    Conduit
                  </span>
                  <span
                    className="t-eyebrow leading-none"
                    style={{
                      color: platform ? 'var(--ink-inverse)' : 'var(--ink-tertiary)',
                      opacity: platform ? 0.55 : 1,
                    }}
                  >
                    {platform ? 'Platform console' : 'Customer support platform'}
                  </span>
                </span>
              </Link>

              <span
                className="t-eyebrow shrink-0 rounded-chip border px-2.5 py-1"
                style={{
                  color: 'var(--copper-ink)',
                  borderColor: platform
                    ? 'color-mix(in oklab, var(--ink-inverse) 15%, transparent)'
                    : 'var(--rule-base)',
                  background: platform
                    ? 'color-mix(in oklab, var(--ink-inverse) 6%, transparent)'
                    : 'var(--surface-raised)',
                }}
              >
                Sheet 08 · Access
              </span>
            </div>

            <div className="mt-9">{aside ?? (platform ? <PlatformAside /> : <TenantAside />)}</div>
          </div>

          <div
            className="flex items-center justify-between gap-4 border-t pt-5"
            style={{
              borderColor: platform
                ? 'color-mix(in oklab, var(--ink-inverse) 12%, transparent)'
                : 'var(--rule-soft)',
            }}
          >
            <span
              className="t-eyebrow"
              style={{
                color: platform ? 'var(--ink-inverse)' : 'var(--ink-tertiary)',
                opacity: platform ? 0.5 : 1,
              }}
            >
              Andishi · Nairobi
            </span>

            <span
              className="t-chip inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1"
              style={{
                color: 'var(--verdigris-ink)',
                background: platform
                  ? 'color-mix(in oklab, var(--ink-inverse) 5%, transparent)'
                  : 'var(--verdigris-tint)',
                borderColor: platform
                  ? 'color-mix(in oklab, var(--ink-inverse) 10%, transparent)'
                  : 'var(--verdigris-rule)',
              }}
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: 'var(--verdigris-solid)' }}
              />
              Isolation active
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
