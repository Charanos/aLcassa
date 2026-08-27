import type { Metadata } from 'next';
import { IconInfoCircle } from '@tabler/icons-react';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { NewPasswordFields } from '@/components/access/NewPasswordFields';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell eyebrow="Workspace" title="Choose a new password" aside={<TenantAside />}>
      <form className="grid gap-4" method="post" action="/api/v1/auth/password/reset">
        <input type="hidden" name="token" value={token ?? ''} />

        {/*
          The meter shows the SAME rules POST /v1/auth/password/reset enforces.
          Until now the only way to discover the twelve-character minimum or
          the match requirement was to submit and be refused.
        */}
        <NewPasswordFields confirmName="passwordConfirm" />

        <div
          className="flex gap-2.5 rounded-chip border p-3"
          style={{
            background: 'var(--surface-sunken)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <IconInfoCircle
            size={16}
            stroke={1.5}
            aria-hidden
            className="mt-px shrink-0 text-warning"
          />
          <p className="t-caption">Setting a new password signs you out everywhere else.</p>
        </div>

        <Button type="submit" variant="primary" size="lg" className="mt-1 w-full">
          Set new password
        </Button>
      </form>
    </AuthShell>
  );
}
