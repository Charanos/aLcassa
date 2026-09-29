import type { Metadata } from 'next';
import { IconArrowRight, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { ERROR_CODES, ERROR_MESSAGES, hueTokens, type ErrorCode } from '@/lib/errors';
import { AuthShell } from '@/components/access/AuthShell';
import { SubmitButton } from '@/components/primitives/SubmitButton';
import { WorkspaceJourney } from '@/components/access/WorkspaceJourney';
import { WorkspaceSlugPreview } from '@/components/access/WorkspaceSlugPreview';

export const metadata: Metadata = {
  title: 'Finish creating your workspace',
  robots: { index: false, follow: false },
};

export default async function FinishOAuthSignUpPage({
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

  return (
    <AuthShell
      lede="You are authenticated with Google. Just name your workspace to finish setup."
      cardMaxWidth="max-w-[540px]"
      aside={<WorkspaceJourney current="create" />}
    >
      <form className="space-y-0" method="post" action="/api/v1/auth/sign-up/finish">
        {errorMessage ? (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 px-1 py-1 text-sm leading-relaxed transition-all"
            style={{ color: tone.fg }}
          >
            <IconAlertCircle
              size={15}
              stroke={2.5}
              className="mt-[2.5px] shrink-0"
              style={{ color: tone.rule }}
            />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {/* Row 1: Workspace slug */}
        <div className="mb-5">
          <WorkspaceSlugPreview />
        </div>

        {/* Trust signals */}
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {['Starts on a free trial', 'No card required', 'You are the workspace owner'].map(
            (line) => (
              <span
                key={line}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]"
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
          <span>Complete setup</span>
          <IconArrowRight size={15} />
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
