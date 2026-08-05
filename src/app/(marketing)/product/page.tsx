import Link from 'next/link';
import type { Metadata } from 'next';
import { Mark } from '@/components/brand/Mark';
import { Button } from '@/components/primitives/Button';

export const metadata: Metadata = {
  title: 'One inbox for every message your customers send',
  description:
    'WhatsApp, Instagram, Messenger and your website, handled in one place by one team. Currently in development.',
};

/**
 * 02 §2 · 10 §2. The marketing surface is ONE PAGE and it does not need a kit.
 *
 * Brian has not asked for a marketing site and it is not in scope. What exists
 * is the shell needed to sign in, sign up and satisfy legal obligations.
 *
 * Every string here is from 10 §2. The status paragraph below the fold is
 * unusual on a marketing page and it is correct here: Brian has real early
 * customers with real accounts and a product whose main surface does not exist
 * yet. Saying so plainly is better than a page that implies otherwise.
 *
 * 03 §20: no gradient, no glassmorphism, no statistics band of large numbers
 * with tiny labels, no counting animation. One fade-in on load and nothing else.
 */
export default function MarketingPage() {
  return (
    <main id="main" className="mx-auto px-6 py-16 md:py-24" style={{ maxWidth: '900px' }}>
      <header className="flex items-center gap-3">
        <Mark size={24} title="Conduit" />
      </header>

      <div className="mt-16 md:mt-24">
        <p className="t-eyebrow text-[var(--copper-ink)]">Customer support platform</p>

        <h1 className="t-display mt-5 text-[var(--ink-primary)]">
          One inbox for every message your customers send.
        </h1>

        <p
          className="t-lede mt-6 text-[var(--ink-secondary)]"
          style={{ maxWidth: 'var(--measure-prose)' }}
        >
          WhatsApp, Instagram, Messenger and your website, handled in one place by one team.
          Currently in development.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="quiet" size="lg">
            <Link href="/sign-up">Request access</Link>
          </Button>
        </div>
      </div>

      <hr className="mt-16 border-0 border-t" style={{ borderColor: 'var(--rule-soft)' }} />

      <p
        className="t-body mt-8 text-[var(--ink-secondary)]"
        style={{ maxWidth: 'var(--measure-prose)' }}
      >
        The platform foundation is live. Channel connections arrive in the next phase. If you are
        an early customer, your workspace is already provisioned and you can set up your team now.
      </p>

      <footer
        className="mt-16 flex flex-wrap gap-5 border-t pt-6"
        style={{ borderColor: 'var(--rule-soft)' }}
      >
        {/* 02 §2. The DPA page is not decoration: Brian is a processor for his
            tenants, who are controllers for their own customers, and that
            relationship needs to exist in writing before his first paying
            customer. A linked page is the cheapest correct version. 01 D-09. */}
        <Link className="t-caption text-[var(--ink-tertiary)]" href="/legal/terms">
          Terms of service
        </Link>
        <Link className="t-caption text-[var(--ink-tertiary)]" href="/legal/privacy">
          Privacy notice
        </Link>
        <Link className="t-caption text-[var(--ink-tertiary)]" href="/legal/dpa">
          Data processing terms
        </Link>
        <Link className="t-caption text-[var(--ink-tertiary)]" href="/status">
          Status
        </Link>
      </footer>
    </main>
  );
}
