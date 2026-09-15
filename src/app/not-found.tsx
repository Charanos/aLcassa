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
    <main id="main" className="mx-auto flex min-h-dvh flex-col items-center justify-center px-6">
      <div
        className="w-full max-w-[440px] rounded-[24px] p-2"
        style={{
          background: 'var(--surface-sunken)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          className="relative flex flex-col items-center overflow-hidden rounded-[16px] px-8 py-10 text-center"
          style={{
            background: 'white',
            boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
          }}
        >
          {/* Subtle blue glow at the top */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--blue-50)] to-transparent opacity-50" />

          <div className="relative mb-6">
            <span
              className="grid size-12 place-items-center rounded-2xl"
              style={{
                background: 'white',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 4px 12px -2px rgba(59, 130, 246, 0.15)',
              }}
            >
              <Mark size={22} />
            </span>
          </div>

          <p
            className="relative mb-3 font-mono text-[12px] font-medium tracking-wider uppercase"
            style={{ color: 'var(--blue-500)' }}
          >
            404 Not Found
          </p>

          <h1 className="relative text-[20px] font-medium tracking-tight text-[var(--text-primary)]">
            That is not here.
          </h1>

          <p
            className="relative mt-2.5 text-[14px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Or you do not have access to it. There is no way to tell which from this page, and that
            is deliberate.
          </p>

          <div className="relative mt-8 flex w-full flex-wrap items-center justify-center gap-3">
            <Button asChild variant="primary" size="md">
              <Link href="/">Go home</Link>
            </Button>
            <Button asChild variant="secondary" size="md">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
