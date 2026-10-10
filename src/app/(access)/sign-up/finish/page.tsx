import type { Metadata } from 'next';
import { IconArrowRight, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { ERROR_CODES, ERROR_MESSAGES, hueTokens, type ErrorCode } from '@/lib/errors';
import { AuthShell } from '@/components/access/AuthShell';
import { SubmitButton } from '@/components/primitives/SubmitButton';
import { WorkspaceJourney } from '@/components/access/WorkspaceJourney';
import { WorkspaceSlugPreview } from '@/components/access/WorkspaceSlugPreview';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { isPlatformAdmin, membershipsFor } from '@/lib/auth/resolve';

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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/sign-in?error=${ERROR_CODES.AUTH_SESSION_EXPIRED}`);
  if (!user.email || !user.email_confirmed_at)
    redirect(`/sign-in?error=${ERROR_CODES.AUTH_EMAIL_UNVERIFIED}`);
  const requestId = crypto.randomUUID();
  if (await isPlatformAdmin(user.id, requestId)) redirect('/sign-in?next=%2Fplatform');
  if ((await membershipsFor(user.id, requestId)).length) redirect('/sign-in?next=%2Fapp');

  const knownCode = error && error in ERROR_MESSAGES ? (error as ErrorCode) : null;
  const errorMessage = error
    ? knownCode
      ? ERROR_MESSAGES[knownCode]
      : 'Something went wrong. Try again.'
    : null;
  const tone = hueTokens(knownCode ?? ERROR_CODES.INTERNAL);

  return (
    <AuthShell
      title="Create your workspace"
      lede="Your email is verified. Name your workspace to complete setup."
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

        <div className="mb-5">
          <WorkspaceSlugPreview />
        </div>

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
