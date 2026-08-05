import Link from 'next/link';
import {
  IconClockHour3,
  IconEye,
  IconHistory,
  IconKey,
  IconShieldLock,
  IconUsers,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';

/**
 * Design sheet 08 · Access. The shell every access screen sits in.
 *
 * ⚠ THE ASIDE IS REVAMPED. THE FORM COLUMN IS DELIBERATELY UNTOUCHED. The
 * first pass at the aside put a mark, two paragraphs and an address in a plain
 * sunken column with a lot of unused space, and on review it read as a
 * placeholder waiting to be designed rather than a finished screen. It now
 * carries a properly sized mark and wordmark, a sheet reference tying it to
 * the actual design set, a short scannable trust list rather than prose alone,
 * a whisper of the system's own hatch texture, and a title-block footer
 * instead of a bare address line. The interactive column, the fields and their
 * own card treatment, is out of scope for this pass and stays exactly as it
 * was: review found the forms themselves already correct.
 *
 * Below `lg` the aside drops away and the form stands alone, because on a
 * phone the form is the whole job.
 *
 * The platform variant inverts the aside, the same structural signal the
 * console header uses in 03 §4: Brian should be able to tell at a glance
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
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(440px,44%)]">
      {/* ── The aside. Order swapped so the form is FIRST in the DOM: a
             keyboard or screen reader user reaches the thing they came for
             without traversing marketing copy. ─────────────────────────── */}
      <aside
        className="relative order-2 hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14"
        style={{
          background: platform ? 'var(--surface-invert)' : 'var(--surface-sunken)',
          color: platform ? 'var(--ink-inverse)' : 'var(--ink-primary)',
        }}
      >
        {/* A whisper of the system's own hatch, the technical-drawing texture
            rather than a gradient. Tenant only: on the inverted platform
            surface the neutral hatch reads as noise rather than texture, so
            it is left off there. */}
        {!platform ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: 'var(--hatch-graphite)', opacity: 0.05 }}
          />
        ) : null}

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Mark size={30} tone={platform ? 'inverse' : 'copper'} />
            <span className="t-panel" style={{ fontSize: '20px' }}>
              Conduit
            </span>
          </div>

          {/* The sheet reference, promoted off the same line as the wordmark
              rather than squeezed beside it: two things fighting for one row
              read as cramped, and this is a label the wordmark doesn't need
              to share space with. 08 is the actual number of the access sheet
              in design-docs, covering login, reset, invitation, sessions and
              the role matrix, both doors. */}
          <span
            className="t-eyebrow mt-3 block"
            style={{ color: platform ? 'var(--ink-inverse)' : 'var(--ink-faint)', opacity: platform ? 0.5 : 1 }}
          >
            Sheet 08 · Access
          </span>
        </div>

        <div className="relative z-10" style={{ maxWidth: '40ch' }}>
          {aside}
        </div>

        {/* The title block. A bare address line read as an afterthought; a
            small key-value row is the same drafting-sheet idiom the marketing
            page and the tracker both close on. */}
        <div
          className="relative z-10 flex items-baseline justify-between gap-4 border-t pt-5"
          style={{ borderColor: platform ? 'rgb(255 255 255 / 0.12)' : 'var(--rule-soft)' }}
        >
          <span
            className="t-eyebrow"
            style={{ color: platform ? 'var(--ink-inverse)' : 'var(--ink-tertiary)', opacity: platform ? 0.55 : 1 }}
          >
            Andishi
          </span>
          <span
            className="t-caption"
            style={{ color: platform ? 'var(--ink-inverse)' : 'var(--ink-tertiary)', opacity: platform ? 0.4 : 0.9 }}
          >
            Northern Bypass, Nairobi
          </span>
        </div>
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
            <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--rule-soft)' }}>
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/**
 * A trust row: one glyph, one short line. Three or four of these read faster
 * than two paragraphs of prose and say the same thing, which is the entire
 * argument for using them in an aside a reader spends four seconds on.
 */
function TrustRow({ icon: Icon, children }: { icon: TablerIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon size={16} stroke={1.5} aria-hidden className="mt-0.5 shrink-0 opacity-70" />
      <span className="t-compact" style={{ opacity: 0.85 }}>
        {children}
      </span>
    </li>
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
        The platform foundation is live. Channel connections arrive in the next phase, and your
        workspace, your team and your assistant rules are ready for them now.
      </p>

      <ul className="mt-7 grid gap-3.5">
        <TrustRow icon={IconUsers}>Owners, admins and agents, with a real permission model.</TrustRow>
        <TrustRow icon={IconShieldLock}>
          Your data is isolated at the database level, not by application code.
        </TrustRow>
        <TrustRow icon={IconKey}>An API key is shown once. Not even we can read it back.</TrustRow>
      </ul>
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

      <ul className="mt-7 grid gap-3.5">
        <li className="flex items-start gap-2.5">
          <IconEye size={16} stroke={1.5} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--ink-inverse)', opacity: 0.55 }} />
          <span className="t-compact" style={{ color: 'var(--ink-inverse)', opacity: 0.85 }}>
            Support access is a scoped session, never a bypass.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <IconHistory size={16} stroke={1.5} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--ink-inverse)', opacity: 0.55 }} />
          <span className="t-compact" style={{ color: 'var(--ink-inverse)', opacity: 0.85 }}>
            A tenant can see, and end, any session you open into their workspace.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <IconClockHour3 size={16} stroke={1.5} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--ink-inverse)', opacity: 0.55 }} />
          <span className="t-compact" style={{ color: 'var(--ink-inverse)', opacity: 0.85 }}>
            Sessions last eight hours.
          </span>
        </li>
      </ul>
    </div>
  );
}
