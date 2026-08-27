import Link from 'next/link';
import type { Metadata } from 'next';
import { IconMail } from '@tabler/icons-react';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';

export const metadata: Metadata = {
  title: 'Check your email',
  robots: { index: false, follow: false },
};

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
        <p className="t-caption text-center" style={{ color: 'var(--text-tertiary)' }}>
          Wrong address?{' '}
          <Link
            href="/sign-up"
            className="text-[var(--text-action)] underline underline-offset-2 transition-opacity hover:opacity-80"
          >
            Start again
          </Link>
        </p>
      }
    >
      <div
        className="rounded-panel border p-5 shadow-sm"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <IconMail size={22} stroke={1.5} aria-hidden className="text-warning" />
        <p className="t-body mt-3" style={{ color: 'var(--text-secondary)' }}>
          We sent a confirmation link to{' '}
          <span className="t-data font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
            {email ?? 'your email'}
          </span>
          . It expires in 24 hours.
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
