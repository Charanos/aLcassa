import type { Metadata } from 'next';
import { IconInfoCircle } from '@tabler/icons-react';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { PasswordField } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

/**
 * 02 §3 · 10 §3. Single use, 30 minute expiry, and SUCCESS INVALIDATES EVERY
 * SESSION FOR THAT USER. The note below says so before they submit rather than
 * after, because being signed out of another device is surprising if the first
 * you hear of it is that it happened.
 */
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

        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          helper="At least 12 characters."
        />

        <PasswordField
          label="Confirm new password"
          name="passwordConfirm"
          autoComplete="new-password"
          required
          minLength={12}
        />

        <div
          className="flex gap-2.5 rounded-chip border p-3"
          style={{
            background: 'var(--slate-tint)',
            borderColor: 'var(--slate-rule)',
            color: 'var(--slate-ink)',
          }}
        >
          <IconInfoCircle size={15} stroke={1.5} aria-hidden className="mt-px shrink-0" />
          <p className="t-caption">Setting a new password signs you out everywhere else.</p>
        </div>

        <Button type="submit" variant="primary" size="lg" className="mt-1 w-full">
          Set new password
        </Button>
      </form>
    </AuthShell>
  );
}
