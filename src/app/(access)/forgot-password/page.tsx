import Link from 'next/link';
import type { Metadata } from 'next';
import { EmailAccessShell } from '@/components/access/EmailAccessShell';
import { Button } from '@/components/primitives/Button';
import { Field } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

/** Password-reset responses never confirm whether an account exists. */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  if (sent === '1')
    return (
      <EmailAccessShell
        purpose="recovery"
        title="Check your email"
        lede="If an account matches that address, a reset link will arrive shortly. Open the latest email to continue."
      >
        <div className="grid gap-4">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Check your spam folder too. If nothing arrives, try again in a few minutes.
          </p>
          <Button asChild variant="primary" className="w-full">
            <Link href="/sign-in">Return to sign in</Link>
          </Button>
          <Link
            href="/forgot-password"
            className="text-center text-sm text-[var(--blue-600)] underline underline-offset-4"
          >
            Use another email address
          </Link>
        </div>
      </EmailAccessShell>
    );
  return (
    <EmailAccessShell
      purpose="recovery"
      title="Reset your password"
      lede="Enter your account email to request a password reset link."
      footer={
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Remembered your password?{' '}
          <Link
            href="/sign-in"
            className="font-medium text-[var(--blue-600)] underline underline-offset-4 transition-colors hover:text-[var(--blue-700)]"
          >
            Return to sign in
          </Link>
        </p>
      }
    >
      <form className="grid gap-4" method="post" action="/api/v1/auth/password/forgot">
        <Field
          label="Account email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.co.ke"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-2 w-full cursor-pointer font-medium shadow-sm hover:shadow-md"
        >
          Send reset link
        </Button>
      </form>
    </EmailAccessShell>
  );
}
