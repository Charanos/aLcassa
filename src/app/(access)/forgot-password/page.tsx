import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

/**
 * 02 §3 · 10 §3.
 *
 * ⚠ ALWAYS REPORTS SUCCESS, NEVER CONFIRMS AN ACCOUNT EXISTS. The result copy
 * is "If an account exists for {email}, a reset link is on its way", and the
 * response is a 204 either way.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      lede="Enter the email associated with your workspace account and we will dispatch a secure reset link."
      footer={
        <p className="text-center text-[12.5px] text-[var(--text-secondary)]">
          Remembered your password?{' '}
          <Link
            href="/sign-in"
            className="font-medium text-[var(--blue-600)] hover:text-[var(--blue-700)] underline underline-offset-4 transition-colors"
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
          className="mt-2 w-full font-medium shadow-sm hover:shadow-md cursor-pointer"
        >
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
