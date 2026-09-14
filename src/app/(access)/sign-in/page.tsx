import Link from 'next/link';
import type { Metadata } from 'next';
import { DemoDoors } from '@/components/access/DemoDoors';
import { demoAccessEnabled } from '@/lib/auth/demoAccess';
import { ERROR_CODES, ERROR_MESSAGES, hueTokens, type ErrorCode } from '@/lib/errors';
import { AuthShell } from '@/components/access/AuthShell';
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
      title="Sign in to your workspace"
      lede="Enter your credentials to access your unified messaging console."
      cardMaxWidth="max-w-[460px]"
      footer={
        <div className="space-y-5">
          {/*
            ── Demo bypass. Rendered only where /api/demo would answer. ──
            These links set a session cookie without authenticating anyone.
          */}
          {demoAccessEnabled() ? <DemoDoors /> : null}

          <p className="text-center text-[12.5px] text-[var(--text-secondary)] pt-2">
            Don&apos;t have a workspace yet?{' '}
            <Link
              href="/sign-up"
              className="font-medium text-[var(--blue-600)] hover:text-[var(--blue-700)] underline underline-offset-4 transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      }
    >
      <form className="grid gap-4" method="post" action="/api/v1/auth/sign-in">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {/* Failed sign-in alert banner */}
        {errorMessage ? (
          <div
            role="alert"
            className="rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed transition-all"
            style={{ color: tone.fg, background: tone.bg, borderColor: tone.rule }}
          >
            {errorMessage}
          </div>
        ) : null}

        {/* Arriving from a completed password reset */}
        {reset ? (
          <div
            role="status"
            className="rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed"
            style={{
              color: 'var(--ink-700)',
              background: 'var(--surface-sunken)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            Your password has been changed, and every other active session was signed out. Please sign in with your new password.
          </div>
        ) : null}

        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.co.ke"
        />

        <div>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end -mt-2 mb-2">
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium text-[var(--blue-600)] hover:text-[var(--blue-700)] transition-colors hover:underline underline-offset-2"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full font-medium shadow-sm hover:shadow-md">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
