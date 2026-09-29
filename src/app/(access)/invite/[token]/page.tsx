import Link from 'next/link';
import type { Metadata } from 'next';
import { IconBuilding } from '@tabler/icons-react';
import { AuthShell } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field } from '@/components/primitives/Field';
import { NewPasswordFields } from '@/components/access/NewPasswordFields';
import { readInvitationByToken } from '@/modules/membership';

export const metadata: Metadata = {
  title: 'Accept your invitation',
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ state?: 'expired' | 'accepted' | 'revoked' }>;
}) {
  const { token } = await params;
  const { state: stateParam } = await searchParams;

  /**
   * ⚠ THE INVITATION IS READ HERE, NOT TRUSTED FROM `?state=`.
   *
   * The three refusal screens below used to be driven entirely by a query
   * parameter, which is fine for reviewing a design and wrong the moment the
   * page is real: anyone could append `?state=accepted` to a live invitation
   * and be told it was already used, and — worse — a genuinely expired
   * invitation with no parameter would render the accept form as though it
   * still worked.
   *
   * `readInvitation` looks the token up by hash and returns the workspace,
   * the role and the true state. The parameter is still honoured when the
   * lookup finds nothing, so the designed screens remain reachable for review.
   */
  const invitation = await readInvitationByToken(token, crypto.randomUUID());

  // 'pending' is a state the refusal screens must NOT render, so it collapses
  // to undefined and the accept form shows instead.
  const state =
    invitation && invitation.state !== 'pending'
      ? invitation.state
      : invitation
        ? undefined
        : stateParam;

  const company = invitation?.tenantName ?? 'Acme Industrial';
  const inviter = invitation?.invitedByName ?? 'Grace Wanjiku';
  const role = invitation?.invitedRole ?? 'agent';

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

  return (
    <AuthShell
      title={`Join ${company}`}
      lede="You have been granted access to this workspace. Complete your profile to proceed."
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
            As a team member on {company}, you can access customer threads and collaborate in
            real-time.
          </p>
        </div>
      </div>

      <form className="grid gap-4" method="post" action={`/api/v1/invitations/accept/${token}`}>
        <Field
          label="Your full name"
          name="fullName"
          autoComplete="name"
          required
          placeholder="e.g. Amina Wanjiku"
        />

        <NewPasswordFields label="Create your account password" showConfirm={false} />

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
