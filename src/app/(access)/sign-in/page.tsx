import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field, PasswordField } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

/**
 * 02 §3 · 10 §3.
 *
 * Front end only: M2 wires the action. What is already correct here is the
 * shape, because the shape is what the copy deck and the role model constrain.
 *
 * `?next=` is preserved throughout, so a user bounced here by middleware lands
 * back where they were trying to go rather than on a generic overview. The
 * hidden input is how that survives a form post without a client component.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      eyebrow="Workspace"
      title="Sign in"
      aside={<TenantAside />}
      footer={
        <p className="t-caption text-[var(--ink-tertiary)]">
          No workspace yet?{' '}
          <Link
            href="/sign-up"
            className="text-[var(--copper-ink)] underline decoration-[var(--copper-rule)] underline-offset-2"
          >
            Create one
          </Link>
        </p>
      }
    >
      <form className="grid gap-4" method="post" action="/api/v1/auth/sign-in">
        {next ? <input type="hidden" name="next" value={next} /> : null}

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
            className="t-caption text-[var(--copper-ink)] underline decoration-[var(--copper-rule)] underline-offset-2"
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
