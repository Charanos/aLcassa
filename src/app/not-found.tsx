import Link from 'next/link';
import type { Metadata } from 'next';
import { Mark } from '@/components/brand/Mark';
import { Button } from '@/components/primitives/Button';

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};

/**
 * 02 §11 · 07 §1 · 10 §12. THE ROOT 404.
 *
 * The exact copy from the deck: "That is not here, or you do not have access
 * to it." That sentence is doing real work, not being vague for style. `07 §1`
 * is explicit: a resource in another tenant returns 404, never 403, because a
 * 403 confirms the resource exists, which is an information leak on a
 * multi-tenant platform. This page is what that rule looks like on screen: it
 * never says which of the two is true.
 *
 * 03 §20's anti-pattern list applies here exactly as it does to the
 * placeholder surfaces: no illustration, no broken-robot graphic, no joke.
 * Plain type on a plain surface reads as deliberate rather than unfinished.
 *
 * 02 §11 eventually wants a not-found per route group, "a missing tenant
 * reads differently from a missing settings page." This root one covers every
 * route until those are written; it is the honest baseline, not the finished
 * state.
 */
export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--surface-page)', maxWidth: '480px' }}
    >
      <Mark size={28} />

      <p className="t-data mt-8 tabular-nums" style={{ color: 'var(--copper-ink)', fontSize: '13px' }}>
        404
      </p>

      <h1 className="t-title mt-3 text-[var(--ink-primary)]">That is not here.</h1>

      <p className="t-body mt-3 text-[var(--ink-secondary)]">
        Or you do not have access to it. There is no way to tell which from this page, and that is
        deliberate.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="primary" size="lg">
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
