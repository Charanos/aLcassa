import Link from 'next/link';
import type { Metadata } from 'next';
import { IconArrowRight } from '@tabler/icons-react';
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
        <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
          Already have a workspace?{' '}
          <Link
            href="/sign-in"
            className="text-[var(--text-action)] underline underline-offset-2 hover:opacity-80 transition-opacity"
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

        <Button type="submit" variant="accent" size="lg" className="mt-2 w-full gap-2">
          <span>Create workspace</span>
          <IconArrowRight size={16} />
        </Button>

        <p className="t-caption mt-1" style={{ color: 'var(--text-tertiary)' }}>
          By creating a workspace you agree to the{' '}
          <Link href="/legal/terms" className="text-[var(--text-action)] underline underline-offset-2 hover:opacity-80">
            terms of service
          </Link>{' '}
          and the{' '}
          <Link
            href="/legal/privacy"
            className="text-[var(--text-action)] underline underline-offset-2 hover:opacity-80"
          >
            privacy notice
          </Link>
          .
        </p>

        {/* Security Assurance Ticker */}
        <div
          className="mt-4 border-t pt-4 flex flex-wrap items-center justify-between gap-2 t-micro"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
        >
          <span className="flex items-center gap-1.5">
            <span className="size-1 rounded-full" style={{ background: 'var(--success-fg)' }} /> POSTGRES RLS
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1 rounded-full" style={{ background: 'var(--accent-mark)' }} /> ARGON2 HASHED
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1 rounded-full" style={{ background: 'var(--blue-500)' }} /> MULTI-TENANT RBAC
          </span>
        </div>
      </form>
    </AuthShell>
  );
}
