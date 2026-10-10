import Link from 'next/link';
import type { Metadata } from 'next';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { GoogleAccess } from '@/components/access/GoogleAccess';
import { DemoDoors } from '@/components/access/DemoDoors';
import { demoAccessEnabled } from '@/lib/auth/demoAccess';
import { ERROR_CODES, ERROR_MESSAGES, hueTokens, type ErrorCode } from '@/lib/errors';
import { AuthShell } from '@/components/access/AuthShell';
import { SubmitButton } from '@/components/primitives/SubmitButton';
import { Field, PasswordField } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

/** The sign-in form posts directly and uses 303 redirects so authentication works without client JavaScript. */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reset?: string }>;
}) {
  const { next, error, reset } = await searchParams;

  /** Query-string error codes are untrusted; render only messages from the approved catalogue. */
  const knownCode = error && error in ERROR_MESSAGES ? (error as ErrorCode) : null;
  const errorMessage = error
    ? knownCode
      ? ERROR_MESSAGES[knownCode]
      : 'Something went wrong. Try again.'
    : null;

  /** Use catalogue severity to distinguish a correctable entry from a blocked account. */
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

          <p className="pt-2 text-center text-sm text-[var(--text-secondary)]">
            Don&apos;t have a workspace yet?{' '}
            <Link
              href="/sign-up"
              className="font-medium text-[var(--blue-600)] underline underline-offset-4 transition-colors hover:text-[var(--blue-700)]"
            >
              Create one
            </Link>
          </p>
        </div>
      }
    >
      <GoogleAccess next={next} purpose="sign-in" />

      <form className="grid gap-4" method="post" action="/api/v1/auth/sign-in">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {/* Failed sign-in alert banner */}
        {errorMessage ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 px-1 py-1 text-sm leading-relaxed transition-all"
            style={{ color: tone.fg }}
          >
            <IconAlertCircle
              size={15}
              stroke={2.5}
              className="mt-[2.5px] shrink-0"
              style={{ color: tone.rule }}
            />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {/* Arriving from a completed password reset */}
        {reset ? (
          <div
            role="status"
            className="flex items-start gap-2.5 px-1 py-1 text-sm leading-relaxed text-[var(--text-secondary)]"
          >
            <IconInfoCircle
              size={15}
              stroke={2.5}
              className="mt-[2.5px] shrink-0 text-[var(--text-tertiary)]"
            />
            <span>
              Your password has been changed, and every other active session was signed out. Please
              sign in with your new password.
            </span>
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
          <div className="-mt-2 mb-2 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[var(--blue-600)] underline-offset-2 transition-colors hover:text-[var(--blue-700)] hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <SubmitButton
          variant="primary"
          size="lg"
          className="w-full font-medium shadow-sm hover:shadow-md"
        >
          Sign in
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
