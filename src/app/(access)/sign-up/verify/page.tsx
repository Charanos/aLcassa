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

/**
 * ⚠ THE READER IS ALREADY SIGNED IN AND ALREADY OWNS A WORKSPACE WHEN THEY
 * LAND HERE. `/api/v1/auth/sign-up` commits the tenant, issues a session and
 * only then redirects, so this page is a receipt and a nudge — not a gate.
 * That is why it offers a way INTO the product rather than only a way to wait:
 * the classic "check your email" cul-de-sac is where self-serve funnels lose
 * people, and there is nothing here worth losing them over.
 */
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
      lede="We have dispatched a secure link to activate your workspace enclave."
      footer={
        <p className="text-center text-[12.5px] text-[var(--text-secondary)]">
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
      <div className="rounded-2xl border border-[var(--ink-200)]/90 bg-[var(--ink-50)]/60 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--blue-500)]/10 text-[var(--blue-600)]">
            <IconMail size={22} stroke={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block font-mono text-[11px] tracking-wider text-[var(--text-tertiary)] uppercase">
              Recipient Address
            </span>
            <span className="block truncate font-mono text-[13px] font-medium text-[var(--text-primary)]">
              {email ?? 'your workspace email'}
            </span>
          </div>
        </div>
        <p className="mt-3.5 border-t border-[var(--ink-200)]/70 pt-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
          Click the link in the message to activate your workspace and complete setup. Links remain
          valid for 24 hours.
        </p>
      </div>

      {resent ? (
        <div
          role="status"
          className="mt-4 rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed"
          style={{
            color: 'var(--success-fg)',
            background: 'var(--success-bg)',
            borderColor: 'var(--success-fg)',
          }}
        >
          Sent again. If it still does not arrive, check your spam folder — or continue into your
          workspace and confirm later.
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed"
          style={{ color: tone.fg, background: tone.bg, borderColor: tone.rule }}
        >
          {errorMessage}
        </div>
      ) : null}

      {/*
        ⚠ THE ADDRESS TRAVELS IN A HIDDEN FIELD RATHER THAN OFF THE SESSION.
        The resend endpoint has to work for a reader whose session cookie was
        dropped between the redirect and the click — which is precisely the
        browser-configuration case where the first mail also tends to go
        missing. It is safe: Supabase's `resend` is a no-op for an unknown or
        already-confirmed address, and the endpoint answers the same either
        way, so this cannot be used to test whether an account exists.
      */}
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
      <p className="mt-3 text-center text-[12px] text-[var(--text-secondary)]">
        <Link
          href="/app"
          className="font-medium text-[var(--blue-600)] underline underline-offset-4 transition-colors hover:text-[var(--blue-700)]"
        >
          Continue to your workspace
        </Link>{' '}
        — you can confirm your email any time.
      </p>
    </AuthShell>
  );
}
