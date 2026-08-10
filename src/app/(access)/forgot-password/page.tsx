import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
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
      eyebrow="Workspace"
      title="Reset your password"
      lede="Enter your email and we will send a reset link."
      aside={<TenantAside />}
      footer={
        <p className="t-caption text-center" style={{ color: 'var(--text-tertiary)' }}>
          Remembered it?{' '}
          <Link
            href="/sign-in"
            className="text-[var(--text-action)] underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form className="grid gap-4" method="post" action="/api/v1/auth/password/forgot">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.co.ke"
        />

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
