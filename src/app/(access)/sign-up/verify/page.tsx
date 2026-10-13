import Link from 'next/link';
import type { Metadata } from 'next';
import { IconMail } from '@tabler/icons-react';
import { ERROR_CODES, ERROR_MESSAGES, hueTokens, type ErrorCode } from '@/lib/errors';
import { AuthShell } from '@/components/access/AuthShell';
import { WorkspaceJourney } from '@/components/access/WorkspaceJourney';
import { Button } from '@/components/primitives/Button';

export const metadata: Metadata = {
  title: 'Check your email',
  robots: { index: false, follow: false },
};

/** Workspace creation succeeded; verified provider identity is required before entry. */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; resent?: string; error?: string }>;
}) {
  const { email, resent, error } = await searchParams;

  /* Same discipline as the sign-in page: the code is attacker-supplied, so it
     is looked up rather than rendered, and an unknown value degrades to the
     generic line instead of reaching the DOM. */
  const knownCode = error && error in ERROR_MESSAGES ? (error as ErrorCode) : null;
  const errorMessage = error
    ? knownCode
      ? ERROR_MESSAGES[knownCode]
      : 'Something went wrong. Try again.'
    : null;
  const tone = hueTokens(knownCode ?? ERROR_CODES.INTERNAL);

  return (
    <AuthShell
      title="Confirm your email"
      cardMaxWidth="max-w-[560px] lg:max-w-[940px] xl:max-w-[1000px]"
      aside={<WorkspaceJourney current="confirm" />}
      lede="Open the latest confirmation email to finish signing in to your workspace."
      footer={
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Incorrect email address?{' '}
          <Link
            href="/sign-up"
            className="font-medium text-[var(--blue-600)] underline underline-offset-4 transition-colors hover:text-[var(--blue-700)]"
          >
            Start over
          </Link>
        </p>
      }
    >
      <div className="rounded-card border border-[var(--ink-200)]/90 bg-[var(--ink-50)]/60 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-overlay bg-[var(--blue-500)]/10 text-[var(--blue-600)]">
            <IconMail size={22} stroke={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block font-mono text-xs tracking-wider text-[var(--text-tertiary)] uppercase">
              Recipient Address
            </span>
            <span className="block text-sm font-medium break-all text-[var(--text-primary)]">
              {email ?? 'your workspace email'}
            </span>
          </div>
        </div>
        <p className="mt-3.5 border-t border-[var(--ink-200)]/70 pt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Open the link in the same browser to confirm your email. If you request another message,
          use its latest link.
        </p>
      </div>

      {resent ? (
        <div
          role="status"
          className="mt-4 rounded-overlay border px-3.5 py-2.5 text-sm leading-relaxed"
          style={{
            color: 'var(--success-fg)',
            background: 'var(--success-bg)',
            borderColor: 'var(--success-fg)',
          }}
        >
          Check your inbox and spam folder for the latest confirmation email.
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-overlay border px-3.5 py-2.5 text-sm leading-relaxed"
          style={{ color: tone.fg, background: tone.bg, borderColor: tone.rule }}
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Accept the resend address from the form so the flow survives a lost session; responses do not reveal account existence. */}
      <form className="mt-5" method="post" action="/api/v1/auth/verify-email/resend">
        <input type="hidden" name="email" value={email ?? ''} />
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          className="w-full cursor-pointer font-medium shadow-2xs"
          disabled={!email}
        >
          Resend verification email
        </Button>
      </form>

      {/*
        The way out. 02 §4's setup checklist is waiting on the overview, and
        it is a far better second step than staring at an inbox.
      */}
      <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">
        <Link
          href="/sign-in"
          className="font-medium text-[var(--blue-600)] underline underline-offset-4 transition-colors hover:text-[var(--blue-700)]"
        >
          Already confirmed? Sign in
        </Link>{' '}
      </p>
    </AuthShell>
  );
}
