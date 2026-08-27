import Link from 'next/link';
import { IconShieldCheck, IconLock } from '@tabler/icons-react';
import { Wordmark } from '@/components/brand/Mark';
import { PlatformAside, TenantAside } from './AuthAside';

export { PlatformAside, TenantAside };

/**
 * Access Shell.
 *
 * Core Layout:
 *   - Form Side (`main`): Left column, naturally scrollable for tall forms/screens.
 *   - Aside (`aside`): Right column, rigidly sticky to the top of the viewport (`h-screen lg:sticky lg:top-0 lg:self-start`).
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
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_minmax(440px,42%)] xl:grid-cols-[1fr_minmax(500px,44%)]">
      {/* ── Left: Form Side ── */}
      <main
        id="main"
        className="relative order-1 flex min-h-screen flex-col justify-center overflow-hidden px-6 py-12 sm:px-10 md:px-16 lg:px-16 xl:px-20"
        style={{ background: 'var(--surface-base)' }}
      >
        {/* Watermark icon behind the form */}
        <div className="pointer-events-none absolute bottom-10 -left-16 hidden rotate-12 transform text-ink-muted/[0.08] sm:block">
          <IconShieldCheck size={340} stroke={1} />
        </div>

        <div className="relative z-10 mx-auto w-full" style={{ maxWidth: '440px' }}>
          {/* Brand mark on form column */}
          <Link
            href="/"
            aria-label="Back to aLcassa homepage"
            className="mb-8 inline-flex items-center gap-2.5 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--border-focus)]"
          >
            <Wordmark size={24} />
          </Link>

          {eyebrow ? (
            <div className="mb-3 flex items-center gap-2.5">
              <span
                aria-hidden
                className="block h-px w-6"
                style={{ background: 'var(--accent-mark)' }}
              />
              <span
                className="t-eyebrow font-medium tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                {eyebrow}
              </span>
            </div>
          ) : null}

          <h1 className="display display-md" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>

          {lede ? (
            <p
              className="t-lede mt-2.5"
              style={{ color: 'var(--text-secondary)', maxWidth: '42ch' }}
            >
              {lede}
            </p>
          ) : null}

          <div className="mt-7">{children}</div>

          {footer ? (
            <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
              {footer}
            </div>
          ) : null}
        </div>
      </main>

      {/* ── Right: Aside (Sticky 100vh Viewport Locked) ── */}
      <aside
        aria-label="Security and Platform Telemetry"
        className="relative order-2 hidden overflow-hidden border-l p-8 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:self-start xl:p-12"
        style={{
          background: 'var(--surface-sunken)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Subtle dot grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--border-strong) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Lock watermark */}
        <div className="pointer-events-none absolute top-12 -right-12 rotate-45 transform text-warning/[0.08]">
          <IconLock size={260} stroke={1} />
        </div>

        {/* Aside Header */}
        <div className="relative z-10">
          <div
            className="t-eyebrow inline-flex items-center gap-2 rounded-chip border px-3 py-1.5 font-medium tracking-wider"
            style={{
              background: 'var(--surface-raised)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <span
              className="size-1.5 animate-pulse rounded-full"
              style={{ background: 'var(--success-fg)' }}
            />
            <span>SECURE ACCESS ENCLAVE</span>
          </div>
        </div>

        {/* Aside Centerpiece */}
        <div className="relative z-10 my-auto py-4">
          {aside ?? (platform ? <PlatformAside /> : <TenantAside />)}
        </div>

        {/* Aside Footer */}
        <footer
          className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-t pt-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <span className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
            aLcassa · Enterprise Security
          </span>

          <span className="t-chip inline-flex items-center gap-1.5 rounded-chip border border-success/30 bg-success/15 px-2.5 py-1 font-medium text-success">
            <span
              aria-hidden
              className="size-1.5 animate-pulse rounded-full"
              style={{ background: 'var(--success-fg)' }}
            />
            Isolation Verified
          </span>
        </footer>
      </aside>
    </div>
  );
}
