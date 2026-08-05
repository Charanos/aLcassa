import Link from 'next/link';
import type { Metadata } from 'next';
import { IconMail } from '@tabler/icons-react';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';

export const metadata: Metadata = {
  title: 'Check your email',
  robots: { index: false, follow: false },
};

/** 10 §3. */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell
      eyebrow="Workspace"
      title="Check your email"
      aside={<TenantAside />}
      footer={
        <p className="t-caption text-[var(--ink-tertiary)]">
          Wrong address?{' '}
          <Link
            href="/sign-up"
            className="text-[var(--copper-ink)] underline decoration-[var(--copper-rule)] underline-offset-2"
          >
            Start again
          </Link>
        </p>
      }
    >
      <div
        className="rounded-panel border p-5"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--rule-soft)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <IconMail size={20} stroke={1.5} aria-hidden className="text-[var(--copper-ink)]" />
        <p className="t-body mt-3 text-[var(--ink-secondary)]">
          We sent a confirmation link to{' '}
          <span className="t-data text-[var(--ink-primary)]">{email ?? 'your email'}</span>. It
          expires in 24 hours.
        </p>
      </div>

      <form className="mt-5" method="post" action="/api/v1/auth/verify-email/resend">
        <Button type="submit" variant="secondary" size="lg" className="w-full">
          Send it again
        </Button>
      </form>
    </AuthShell>
  );
}
