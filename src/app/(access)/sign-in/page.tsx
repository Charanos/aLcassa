import Link from 'next/link';
import type { Metadata } from 'next';
import { demoAccessEnabled } from '@/lib/auth/demoAccess';
import { ERROR_CODES, ERROR_MESSAGES, hueTokens, type ErrorCode } from '@/lib/errors';
import { IconArrowRight, IconBuildingSkyscraper, IconShieldLock } from '@tabler/icons-react';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field, PasswordField } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

/**
 * The workspace door. 02 §3.
 *
 * ⚠ IT IS A PLAIN `<form method="post">` WITH NO JAVASCRIPT BEHIND IT.
 *
 * A sign-in screen that needs a bundle to work is a sign-in screen that
 * breaks in exactly the conditions where someone most needs to get in. So the
 * form posts to `/api/v1/auth/sign-in`, which answers a form post with a 303,
 * and failures come back as `?error=<code>` for the block below to render.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reset?: string }>;
}) {
  const { next, error, reset } = await searchParams;

  /**
   * The code came off a query string, so it is attacker-controlled and is
   * NEVER rendered directly. It is looked up in the catalogue, and an
   * unrecognised value falls back to the generic message — which means a
   * crafted `?error=<script>` renders as "Something went wrong" rather than
   * as anything at all.
   */
  const knownCode = error && error in ERROR_MESSAGES ? (error as ErrorCode) : null;
  const errorMessage = error
    ? knownCode
      ? ERROR_MESSAGES[knownCode]
      : 'Something went wrong. Try again.'
    : null;

  /**
   * The hue comes from the catalogue rather than being fixed here, because
   * these failures are not all the same kind. A wrong password is OCHRE —
   * the reader retypes it and continues. "Your account is not attached to a
   * workspace" is OXIDE — there is nothing they can do without someone else
   * acting first. Sheet 12 is explicit that flattening the two teaches
   * people to ignore the colour.
   */
  const tone = hueTokens(knownCode ?? ERROR_CODES.INTERNAL);

  return (
    <AuthShell
      eyebrow="Workspace"
      title="Sign in"
      aside={<TenantAside />}
      footer={
        <div className="space-y-4">
          {/*
            ── Demo bypass. Rendered only where /api/demo would answer. ──
            These links set a session cookie without authenticating anyone,
            so the control disappears wherever the route refuses. Offering a
            button that 404s is worse than offering none: it reads as a
            broken product rather than a closed door. See lib/auth/demoAccess.
          */}
          {demoAccessEnabled() ? (
            <div
              className="rounded-panel border p-4 shadow-sm transition-all duration-300"
              style={{
                background: 'var(--surface-raised)',
                borderColor: 'var(--border-strong)',
              }}
            >
              <p className="t-caption mb-3" style={{ color: 'var(--text-tertiary)' }}>
                Review access. No account required, and not available where real data lives.
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  asChild
                  variant="primary"
                  size="md"
                  className="w-full justify-center gap-2 text-xs"
                >
                  <Link href="/api/demo?role=platform">
                    <IconShieldLock size={14} stroke={1.75} />
                    <span>Admin Dashboard</span>
                    <IconArrowRight size={13} />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="secondary"
                  size="md"
                  className="w-full justify-center gap-2 text-xs"
                >
                  <Link href="/api/demo?role=tenant">
                    <IconBuildingSkyscraper size={14} stroke={1.75} />
                    <span>Workspace Inbox</span>
                    <IconArrowRight size={13} />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          <p className="t-caption text-center" style={{ color: 'var(--text-tertiary)' }}>
            No workspace yet?{' '}
            <Link
              href="/sign-up"
              className="text-[var(--text-action)] underline underline-offset-2 transition-opacity hover:opacity-80"
            >
              Create one
            </Link>
          </p>
        </div>
      }
    >
      <form className="grid gap-4" method="post" action="/api/v1/auth/sign-in">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {/*
          Sheet 12: a failed sign-in is ochre, not oxide. The reader can act
          on it — retype the password, ask for a reset — so it resolves
          rather than refuses. `role="alert"` so a screen reader announces
          it on the fresh page load rather than leaving it to be discovered.
        */}
        {errorMessage ? (
          <p
            role="alert"
            className="t-caption rounded-panel border px-3 py-2"
            style={{ color: tone.fg, background: tone.bg, borderColor: tone.rule }}
          >
            {errorMessage}
          </p>
        ) : null}

        {/* Arriving from a completed password reset. Slate: nothing is wrong. */}
        {reset ? (
          <p
            role="status"
            className="t-caption rounded-panel border px-3 py-2"
            style={{
              color: 'var(--ink-600)',
              background: 'var(--surface-sunken)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            Your password has been changed, and every other session was signed out. Sign in with the
            new one.
          </p>
        ) : null}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.co.ke"
        />

        <PasswordField label="Password" name="password" autoComplete="current-password" required />

        <div className="flex items-center justify-between gap-4">
          <Link
            href="/forgot-password"
            className="t-caption text-[var(--text-action)] underline underline-offset-2 transition-opacity hover:opacity-80"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
