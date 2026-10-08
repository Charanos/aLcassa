import Link from 'next/link';
import type { Metadata } from 'next';
import { IconBuilding } from '@tabler/icons-react';
import { AuthShell } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field } from '@/components/primitives/Field';
import { NewPasswordFields } from '@/components/access/NewPasswordFields';
import { readInvitationByToken } from '@/modules/membership';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';

export const metadata: Metadata = {
  title: 'Accept your invitation',
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  // Invitation state comes only from the stored token hash.
  const invitation = await readInvitationByToken(token, crypto.randomUUID());
  if (!invitation)
    return (
      <AuthShell
        title="This invitation is not valid"
        lede="Ask the workspace administrator for a new invitation. Open the latest email when it arrives."
      >
        <Button asChild variant="secondary" className="w-full">
          <Link href="/sign-in">Return to sign in</Link>
        </Button>
      </AuthShell>
    );
  const state = invitation.state === 'pending' ? undefined : invitation.state;
  const company = invitation.tenantName;
  const inviter = invitation.invitedByName || 'Your workspace administrator';
  const role = invitation.invitedRole;

  if (state) {
    const copy = {
      expired: {
        title: 'This invitation has expired',
        body: `Ask ${inviter} to send a new one.`,
      },
      accepted: {
        title: 'You have already joined',
        body: `You are already a member of ${company}. Sign in to continue.`,
      },
      revoked: {
        title: 'This invitation was withdrawn',
        body: `Ask ${inviter} if you think that is a mistake.`,
      },
    }[state];

    return (
      <AuthShell title={copy.title} lede={copy.body}>
        <Button asChild variant="secondary" size="lg" className="w-full font-medium shadow-2xs">
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  const identity = await supabase.auth.getUser();
  const signedIn = !identity.error && Boolean(identity.data.user?.email_confirmed_at);

  return (
    <AuthShell
      title={`Join ${company}`}
      lede="Review your invitation and confirm to join this workspace."
      cardMaxWidth="max-w-[620px]"
    >
      <div className="mb-5 flex items-start gap-3 rounded-card border border-[var(--ink-200)]/90 bg-[var(--ink-50)]/60 p-4 shadow-2xs">
        <div className="grid size-8 shrink-0 place-items-center rounded-overlay bg-[var(--orange-500)]/10 text-[var(--orange-600)]">
          <IconBuilding size={18} stroke={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {inviter} invited you
            </span>
            <span className="rounded-panel bg-[var(--blue-500)]/10 px-2 py-0.5 font-mono text-2xs font-medium text-[var(--blue-600)] capitalize">
              {role}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            This invitation is for {invitation.invitedEmail}. Your access follows the {role} role.
          </p>
        </div>
      </div>

      <form className="grid gap-4" method="post" action={`/api/v1/invitations/accept/${token}`}>
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger-fg)]">
            The invitation could not be accepted. Sign in with the invited email address, or ask the
            administrator for a new invitation.
          </p>
        ) : null}
        {!signedIn ? (
          <>
            <Field
              label="Your full name"
              name="fullName"
              autoComplete="name"
              required
              placeholder="e.g. Amina Wanjiku"
            />

            <NewPasswordFields label="Create your account password" showConfirm={false} />
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
              className="text-sm text-[var(--blue-600)] underline underline-offset-4"
            >
              Already have an account? Sign in
            </Link>
          </>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            You are signed in as {identity.data.user?.email}.
          </p>
        )}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="mt-2 w-full cursor-pointer font-medium shadow-sm hover:shadow-md"
        >
          Accept invitation & join workspace
        </Button>
      </form>
    </AuthShell>
  );
}
