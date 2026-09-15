import Link from 'next/link';
import type { Metadata } from 'next';
import { IconShieldCheck } from '@tabler/icons-react';
import { AuthShell } from '@/components/access/AuthShell';
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
    <AuthShell
      title="Set new password"
      lede="Enter a strong, unique password to secure your workspace account."
      footer={
        <p className="text-center text-[12.5px] text-[var(--text-secondary)]">
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
      <form className="grid gap-4" method="post" action="/api/v1/auth/password/reset">
        <input type="hidden" name="token" value={token ?? ''} />

        <NewPasswordFields confirmName="passwordConfirm" />

        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--ink-200)]/80 bg-[var(--ink-50)]/50 p-3 text-[12px] text-[var(--text-secondary)] shadow-2xs">
          <IconShieldCheck
            size={16}
            stroke={2}
            aria-hidden
            className="mt-0.5 shrink-0 text-[var(--success-fg)]"
          />
          <p className="leading-relaxed">
            Setting a new password will immediately revoke and sign out all other active sessions
            across devices.
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-1 w-full cursor-pointer font-medium shadow-sm hover:shadow-md"
        >
          Update password & sign in
        </Button>
      </form>
    </AuthShell>
  );
}
