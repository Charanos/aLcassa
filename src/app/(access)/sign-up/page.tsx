import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field, PasswordField } from '@/components/primitives/Field';
import { WorkspaceSlugPreview } from '@/components/access/WorkspaceSlugPreview';

export const metadata: Metadata = {
  title: 'Create your workspace',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Workspace"
      title="Create your workspace"
      lede="One account for your business, with room for your team from the first day."
      aside={<TenantAside />}
      footer={
        <p className="t-caption text-[var(--ink-tertiary)]">
          Already have a workspace?{' '}
          <Link
            href="/sign-in"
            className="text-[var(--copper-ink)] underline decoration-[var(--copper-rule)] underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form className="grid gap-4" method="post" action="/api/v1/auth/sign-up">
        <Field label="Your name" name="fullName" autoComplete="name" required />

        <WorkspaceSlugPreview />

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.co.ke"
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          helper="At least 12 characters."
        />

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">
          Create workspace
        </Button>

        <p className="t-caption text-[var(--ink-tertiary)]">
          By creating a workspace you agree to the{' '}
          <Link href="/legal/terms" className="text-[var(--copper-ink)] underline underline-offset-2">
            terms of service
          </Link>{' '}
          and the{' '}
          <Link
            href="/legal/privacy"
            className="text-[var(--copper-ink)] underline underline-offset-2"
          >
            privacy notice
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
