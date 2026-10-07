import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

/** Password-reset responses never confirm whether an account exists. */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      lede="Enter the email associated with your workspace account and we will dispatch a secure reset link."
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
    </AuthShell>
  );
}
