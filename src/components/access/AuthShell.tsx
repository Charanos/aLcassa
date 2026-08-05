import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';

/**
 * Design sheet 08 · Access. The shell every access screen sits in.
 *
 * TWO COLUMNS ABOVE `lg`, AND THE SECOND ONE IS NOT DECORATION. An access
 * screen is the first thing a new tenant owner sees, and a lone centred card
 * tells them nothing about what they are signing into. The right column carries
 * the one honest sentence about the product and the current phase, which is the
 * same thing the marketing page says. Below `lg` it drops away and the form
 * stands alone, because on a phone the form is the whole job.
 *
 * The platform variant inverts the aside, which is the same structural signal
 * the console header uses in 03 §4: Brian should be able to tell at a glance
 * that he is on the platform door rather than the tenant one, before he has
 * read a word. There is deliberately no navigational path between them. 02 §3.
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
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,44%)]">
      {/* ── The aside. Order swapped so the form is FIRST in the DOM: a
             keyboard or screen reader user reaches the thing they came for
             without traversing marketing copy. ─────────────────────────── */}
      <aside
        className="order-2 hidden flex-col justify-between p-10 lg:flex xl:p-14"
        style={{
          background: platform ? 'var(--surface-invert)' : 'var(--surface-sunken)',
          color: platform ? 'var(--ink-inverse)' : 'var(--ink-primary)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Mark size={20} tone={platform ? 'inverse' : 'copper'} />
          <span className="t-chip">Conduit</span>
        </div>

        <div style={{ maxWidth: '42ch' }}>{aside}</div>

        <p
          className="t-caption"
          style={{ color: platform ? 'var(--ink-inverse)' : 'var(--ink-tertiary)', opacity: platform ? 0.6 : 1 }}
        >
          Andishi · Northern Bypass, Nairobi
        </p>
      </aside>

      {/* ── The form ─────────────────────────────────────────────────── */}
      <main
        id="main"
        className="order-1 flex flex-col justify-center px-5 py-12 md:px-10 lg:px-14"
        style={{ background: 'var(--surface-page)' }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: '420px' }}>
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2.5 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] lg:hidden"
          >
            <Mark size={20} />
            <span className="t-chip text-[var(--ink-primary)]">Conduit</span>
          </Link>

          {eyebrow ? (
            <div className="mb-3 flex items-center gap-2.5">
              <span
                aria-hidden
                className="block h-px w-5"
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
            <div
              className="mt-8 border-t pt-6"
              style={{ borderColor: 'var(--rule-soft)' }}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/** The standard aside content for the tenant door. */
export function TenantAside() {
  return (
    <div>
      <p className="t-lede text-[var(--ink-primary)]">
        One inbox for every message your customers send.
      </p>
      <p className="t-compact mt-4 text-[var(--ink-secondary)]">
        WhatsApp, Instagram, Messenger and your website, handled in one place by one team.
      </p>
      <p className="t-compact mt-4 text-[var(--ink-secondary)]">
        The platform foundation is live. Channel connections arrive in the next phase, and your
        workspace, your team and your assistant rules are ready for them now.
      </p>
    </div>
  );
}

/** 10 §3. The platform door says what it is and that access is logged. */
export function PlatformAside() {
  return (
    <div>
      <p className="t-lede" style={{ color: 'var(--ink-inverse)' }}>
        This account manages every workspace.
      </p>
      <p className="t-compact mt-4" style={{ color: 'var(--ink-inverse)', opacity: 0.75 }}>
        Every action taken here is written to the platform audit log, and every time you step into a
        workspace it is written to that workspace&rsquo;s own log as well, where its owner can see
        it.
      </p>
      <p className="t-compact mt-4" style={{ color: 'var(--ink-inverse)', opacity: 0.75 }}>
        Sessions last eight hours.
      </p>
    </div>
  );
}
