import Link from 'next/link';
import type { Metadata } from 'next';
import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { ERROR_CODES, ERROR_MESSAGES, hueTokens, type ErrorCode } from '@/lib/errors';
import { AuthShell } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field } from '@/components/primitives/Field';
import { NewPasswordFields } from '@/components/access/NewPasswordFields';
import { WorkspaceJourney } from '@/components/access/WorkspaceJourney';
import { WorkspaceSlugPreview } from '@/components/access/WorkspaceSlugPreview';

export const metadata: Metadata = {
  title: 'Create your workspace',
  robots: { index: false, follow: false },
};

/**
 * ⚠ THE FORM POSTS TO A ROUTE THAT NOW EXISTS. Until this pass it posted to
 * `/api/v1/auth/sign-up`, which had never been written — every submission
 * 404ed. The endpoint is real, and the block below is what makes its failures
 * visible: without it, a rejected registration bounced back to a pristine
 * empty form with no explanation, which reads as the form having eaten the
 * submission.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  /* Looked up, never rendered — the code is attacker-supplied. Same
     discipline as `/sign-in`. */
  const knownCode = error && error in ERROR_MESSAGES ? (error as ErrorCode) : null;
  const errorMessage = error
    ? knownCode
      ? ERROR_MESSAGES[knownCode]
      : 'Something went wrong. Try again.'
    : null;
  const tone = hueTokens(knownCode ?? ERROR_CODES.INTERNAL);
  /* The one failure with a specific way out worth putting a control on. */
  const emailTaken = knownCode === ERROR_CODES.SIGNUP_EMAIL_TAKEN;

  return (
    <AuthShell
      title="Create your workspace"
      lede="One dedicated tenant enclave for your organization, with room for your entire team."
      cardMaxWidth="max-w-[720px] lg:max-w-[1140px] xl:max-w-[1240px]"
      aside={<WorkspaceJourney current="create" />}
      footer={
        <p className="text-center text-[12px] text-[var(--text-secondary)]">
          Already have a workspace?{' '}
          <Link
            href="/sign-in"
            className="font-medium text-[var(--blue-600)] hover:text-[var(--blue-700)] underline underline-offset-4 transition-colors"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5" method="post" action="/api/v1/auth/sign-up">
        {errorMessage ? (
          <div
            role="alert"
            className="sm:col-span-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed"
            style={{ color: tone.fg, background: tone.bg, borderColor: tone.rule }}
          >
            {errorMessage}
            {emailTaken ? (
              <>
                {' '}
                <Link href="/sign-in" className="font-medium underline underline-offset-2">
                  Sign in
                </Link>{' '}
                or{' '}
                <Link href="/forgot-password" className="font-medium underline underline-offset-2">
                  reset your password
                </Link>
                .
              </>
            ) : null}
          </div>
        ) : null}

        {/* Row 1 Left: Full Name */}
        <div className="sm:col-span-1">
          <Field
            label="Your full name"
            name="fullName"
            autoComplete="name"
            required
            placeholder="e.g. Wanjiru Maina"
          />
        </div>

        {/* Row 1 Right: Work Email */}
        <div className="sm:col-span-1">
          <Field
            label="Work email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.co.ke"
          />
        </div>

        {/* Row 2 Left: Company Name & Slug Preview */}
        <div className="sm:col-span-1">
          <WorkspaceSlugPreview />
        </div>

        {/*
          Row 2 Right: Password.

          ⚠ THIS WAS A BARE `PasswordField` WITH HELPER COPY THAT DESCRIBED A
          POLICY NOTHING ENFORCED — "at least 12 characters with letters and
          numbers", where the server requires length alone. Meanwhile
          `NewPasswordFields`, which shows the real rules live as you type,
          was already used by password reset and invitation accept and NOT by
          the one screen where a password is chosen for the first time.

          `showConfirm={false}` on purpose: reset and invitation accept
          confirm because a typo there locks you out of an account you already
          have and cannot see. Here the reader is about to be signed in with
          what they typed, the browser's own password manager has already
          offered to store it, and a second box on a four-field form is
          friction bought with nothing.
        */}
        <div className="sm:col-span-1">
          <NewPasswordFields label="Account password" showConfirm={false} />
        </div>

        {/* Row 3 Full Width: what they are getting, CTA, legal */}
        <div className="sm:col-span-2 pt-1">
          {/*
            ⚠ THE FORM NEVER SAID WHAT IT CREATES. `selfServeSignUp` writes the
            tenant as `trial`, never `active` — 01 D-13 rules out a free plan —
            and until now the only place that was disclosed was the platform
            console's own provisioning dialog, which the reader will never see.
            Someone typing a password into a form is entitled to know whether
            they are starting a trial or opening a bill.

            ⚠ NO COUNTDOWN IS CLAIMED HERE, AND THAT IS NOT AN OVERSIGHT.
            `ProvisionWorkspaceDialog` says "14-day", which is safe on an
            admin surface where a human is setting expectations deliberately.
            Nothing in the registration path writes a `trial_ends_at` — no
            subscription row is created at all — so a public page promising a
            specific number of days would be committing the business to a term
            no code enforces. It says what is true and no more. The moment the
            subscription lifecycle lands, put the real figure here.

            "No card required" IS safe to say: there is no payment gateway
            wired to this flow at all.
          */}
          <div
            className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border px-3.5 py-2.5"
            style={{
              background: 'var(--surface-sunken)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {[
              'Starts on a free trial',
              'No card required',
              'You are the workspace owner',
            ].map((line) => (
              <span
                key={line}
                className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)]"
              >
                <IconCheck
                  size={13}
                  stroke={2.4}
                  aria-hidden
                  className="shrink-0"
                  style={{ color: 'var(--success-fg)' }}
                />
                {line}
              </span>
            ))}
          </div>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full gap-2 font-medium shadow-sm hover:shadow-md cursor-pointer"
          >
            <span>Create workspace</span>
            <IconArrowRight size={15} />
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-[var(--text-tertiary)] mt-2">
            By continuing, you agree to our{' '}
            <Link
              href="/legal/terms"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/legal/privacy"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors"
            >
              Privacy Notice
            </Link>
            .
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
