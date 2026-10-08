import Link from 'next/link';
import type { Metadata } from 'next';
import { IconShieldCheck } from '@tabler/icons-react';
import { EmailAccessShell } from '@/components/access/EmailAccessShell';
import { Button } from '@/components/primitives/Button';
import { NewPasswordFields } from '@/components/access/NewPasswordFields';
import { PasswordSetupForm } from '@/components/access/PasswordSetupForm';
import { requireEmailSession } from '@/lib/auth/emailSession';
import { redirect } from 'next/navigation';
import { isAppError, ERROR_CODES } from '@/lib/errors';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; purpose?: string; error?: string }>;
}) {
  const { code, purpose, error } = await searchParams;
  if (code) redirect(`/auth/confirm?type=recovery&code=${encodeURIComponent(code)}`);
  const invited = purpose === 'invite';
  let verified = false;
  let updating = false;
  let passwordSaved = false;
  try {
    const flow = await requireEmailSession(invited ? 'invite' : 'recovery', crypto.randomUUID());
    passwordSaved = flow.passwordSaved;
    verified = true;
  } catch (error) {
    if (isAppError(error) && error.code === ERROR_CODES.AUTH_FLOW_IN_PROGRESS) updating = true;
    else if (!isAppError(error) || error.code !== ERROR_CODES.AUTH_SESSION_EXPIRED) throw error;
  }
  if (updating)
    return (
      <EmailAccessShell
        purpose={invited ? 'invite' : 'recovery'}
        title="Check your password update"
        lede="An update is being processed or its outcome could not be confirmed. Wait for the first request to finish. If it did not finish, use a new email link after this session expires."
      >
        <Button asChild variant="primary" className="w-full">
          <Link href="/sign-in">Return to sign in</Link>
        </Button>
      </EmailAccessShell>
    );
  if (!verified)
    return (
      <EmailAccessShell
        purpose={invited ? 'invite' : 'recovery'}
        title="Open your latest email link"
        lede="A verified email link is needed before you can choose a password."
      >
        <Button asChild variant="primary" className="w-full">
          <Link href={invited ? '/sign-in' : '/forgot-password'}>
            {invited ? 'Return to sign in' : 'Request a reset link'}
          </Link>
        </Button>
      </EmailAccessShell>
    );
  if (passwordSaved && invited)
    return (
      <EmailAccessShell
        purpose={invited ? 'invite' : 'recovery'}
        title="Your password is saved"
        lede="Workspace setup could not finish. Retry this step without changing your password again."
      >
        <form method="post" action="/api/v1/auth/workspace/activate">
          <Button type="submit" variant="primary" className="w-full">
            Finish workspace setup
          </Button>
        </form>
      </EmailAccessShell>
    );
  if (passwordSaved)
    return (
      <EmailAccessShell
        purpose={invited ? 'invite' : 'recovery'}
        title="Your password is saved"
        lede="Account recovery could not finish. Sign in with your new password. If access is still unavailable, contact support."
      >
        <Button asChild variant="primary" className="w-full">
          <Link href="/sign-in">Return to sign in</Link>
        </Button>
      </EmailAccessShell>
    );

  return (
    <EmailAccessShell
      purpose={invited ? 'invite' : 'recovery'}
      title={invited ? 'Secure your workspace account' : 'Choose a new password'}
      lede={
        invited
          ? 'Choose a password to finish setting up your account and open your workspace.'
          : 'Choose a unique password. You will sign in again after saving it.'
      }
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
      <PasswordSetupForm invited={invited}>
        <input type="hidden" name="purpose" value={invited ? 'invite' : 'recovery'} />
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger-fg)]">
            {error === 'reset_incomplete'
              ? 'Your password was saved, but sign-out could not finish. Sign in with your new password. If access is still unavailable, contact support.'
              : 'Your password could not be saved. Check that both entries match and use at least 12 characters, or choose a different password.'}
          </p>
        ) : null}

        <NewPasswordFields confirmName="passwordConfirm" />

        <div className="flex items-start gap-2.5 rounded-overlay border border-[var(--ink-200)]/80 bg-[var(--ink-50)]/50 p-3 text-sm text-[var(--text-secondary)] shadow-2xs">
          <IconShieldCheck
            size={16}
            stroke={2}
            aria-hidden
            className="mt-0.5 shrink-0 text-[var(--success-fg)]"
          />
          <p className="leading-relaxed">
            Saving your password ends existing application sessions on other devices.
          </p>
        </div>
      </PasswordSetupForm>
    </EmailAccessShell>
  );
}
