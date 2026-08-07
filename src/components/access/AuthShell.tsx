import Link from 'next/link';
import { IconShieldCheck, IconLock } from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { PlatformAside, TenantAside } from './AuthAside';

export { PlatformAside, TenantAside };

/**
 * Design sheet 08 · Access. The shell every access screen sits in.
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
    <div className="grid min-h-dvh items-start lg:grid-cols-[1fr_minmax(480px,46%)] relative overflow-x-hidden">
      {/* ── The form. First in the DOM so a keyboard or screen reader user
             reaches what they came for without traversing the aside. ─────── */}
      <main
        id="main"
        className="order-1 flex min-h-dvh flex-col justify-center px-6 py-12 md:px-12 lg:px-16 relative overflow-hidden"
        style={{ background: 'var(--surface-page)' }}
      >
        {/* Ambient Background Artwork Glow for Form Surface */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-[radial-gradient(ellipse_at_center,var(--copper-tint)_0%,transparent_70%)] opacity-35 blur-3xl" />

        {/* Watermark Background Artwork Icon (Form Surface) */}
        <div className="hidden sm:block absolute bottom-10 -left-16 text-[var(--copper-ink)] opacity-[0.05] dark:opacity-[0.07] pointer-events-none transform rotate-12">
          <IconShieldCheck size={320} stroke={0.75} />
        </div>

        <div className="relative z-10 mx-auto w-full" style={{ maxWidth: '440px' }}>
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
        className="relative order-2 hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto overflow-hidden"
        style={{
          background: platform ? 'var(--surface-invert)' : 'var(--surface-sunken)',
          borderLeft: '1px solid var(--rule-soft)',
        }}
      >
        {/* The drafting-sheet ground: a measured dot grid + watermark artwork icon */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--rule-base) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            opacity: platform ? 0.12 : 0.4,
          }}
        />

        <div className="absolute top-16 -right-16 text-[var(--copper-ink)] opacity-[0.05] dark:opacity-[0.07] pointer-events-none transform rotate-45">
          <IconLock size={280} stroke={0.75} />
        </div>

        {/* Ambient Radial Wash for Aside */}
        <div className="pointer-events-none absolute bottom-0 right-0 size-80 rounded-full bg-[radial-gradient(ellipse_at_center,var(--verdigris-tint)_0%,transparent_70%)] opacity-40 blur-3xl" />

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
                className="size-1.5 rounded-full animate-pulse"
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
