import Link from 'next/link';
import type { Metadata } from 'next';
import { IconArrowRight, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { GoogleLogo } from '@/components/access/GoogleLogo';
import { ERROR_CODES, ERROR_MESSAGES, hueTokens, type ErrorCode } from '@/lib/errors';
import { AuthShell } from '@/components/access/AuthShell';
import { IconTile } from '@/components/primitives/IconTile';
import { SubmitButton, CustomSubmitButton } from '@/components/primitives/SubmitButton';
import { Field } from '@/components/primitives/Field';
import { NewPasswordFields } from '@/components/access/NewPasswordFields';
import { WorkspaceJourney } from '@/components/access/WorkspaceJourney';
import { WorkspaceSlugPreview } from '@/components/access/WorkspaceSlugPreview';

export const metadata: Metadata = {
  title: 'Create your workspace',
  robots: { index: false, follow: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const knownCode = error && error in ERROR_MESSAGES ? (error as ErrorCode) : null;
  const errorMessage = error
    ? knownCode
      ? ERROR_MESSAGES[knownCode]
      : 'Something went wrong. Try again.'
    : null;
  const tone = hueTokens(knownCode ?? ERROR_CODES.INTERNAL);
  const emailTaken = knownCode === ERROR_CODES.SIGNUP_EMAIL_TAKEN;

  return (
    <AuthShell
      lede="One dedicated tenant enclave for your organization, with room for your entire team."
      cardMaxWidth="max-w-[640px]"
      aside={<WorkspaceJourney current="create" />}
      footer={
        <p className="text-center text-[12px] text-[var(--text-secondary)]">
          Already have a workspace?{' '}
          <Link
            href="/sign-in"
            className="font-medium text-[var(--blue-600)] underline underline-offset-4 transition-colors hover:text-[var(--blue-700)]"
          >
            Sign in
          </Link>
        </p>
      }
    >
      {errorMessage ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 px-1 py-1 text-[12.5px] leading-relaxed transition-all"
          style={{ color: tone.fg }}
        >
          <IconAlertCircle size={15} stroke={2.5} className="mt-[2.5px] shrink-0" style={{ color: tone.rule }} />
          <span>
            {errorMessage}
            {emailTaken ? (
              <>
                {' '}
                <Link href="/sign-in" className="font-medium underline underline-offset-2 hover:text-[var(--text-primary)]">
                  Sign in
                </Link>{' '}
                or{' '}
                <Link href="/forgot-password" className="font-medium underline underline-offset-2 hover:text-[var(--text-primary)]">
                  reset your password
                </Link>
                .
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      {/* Google OAuth */}
      <form method="post" action="/api/v1/auth/google" className="mb-5">
        <CustomSubmitButton
          className="group relative flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-[13.5px] font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] active:scale-[0.985]"
        >
          <IconTile 
            icon={GoogleLogo} 
            size="sm" 
            className="transition-transform group-hover:scale-105" 
          />
          Continue with Google
        </CustomSubmitButton>
      </form>

      <div className="relative mb-5 flex items-center">
        <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
        <span className="shrink-0 px-4 text-[10.5px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase">
          or create with email
        </span>
        <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
      </div>

      <form className="space-y-0" method="post" action="/api/v1/auth/sign-up">
        {/* Row 1: Name + Email */}
        <div className="mb-4 grid grid-cols-2 gap-x-4">
          <Field
            label="Your full name"
            name="fullName"
            autoComplete="name"
            required
            placeholder="e.g. Wanjiru Maina"
          />
          <Field
            label="Work email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.co.ke"
          />
        </div>

        {/* Row 2: Workspace slug */}
        <div className="mb-4">
          <WorkspaceSlugPreview />
        </div>

        {/* Row 3: Password */}
        <div className="mb-5">
          <NewPasswordFields label="Account password" showConfirm={false} />
        </div>

        {/* Trust signals */}
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {['Starts on a free trial', 'No card required', 'You are the workspace owner'].map(
            (line) => (
              <span
                key={line}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--text-secondary)]"
              >
                <IconCheck
                  size={12}
                  stroke={3}
                  aria-hidden
                  className="shrink-0"
                  style={{ color: 'var(--success-fg)' }}
                />
                {line}
              </span>
            ),
          )}
        </div>

        {/* CTA */}
        <SubmitButton
          variant="accent"
          size="lg"
          className="w-full cursor-pointer gap-2 font-medium shadow-sm hover:shadow-md"
        >
          <span>Create workspace</span>
          <IconArrowRight size={15} />
        </SubmitButton>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          By continuing, you agree to our{' '}
          <Link
            href="/legal/terms"
            className="text-[var(--text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--text-primary)]"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/legal/privacy"
            className="text-[var(--text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--text-primary)]"
          >
            Privacy Notice
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
