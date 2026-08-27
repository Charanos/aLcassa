import Link from 'next/link';
import type { Metadata } from 'next';
import { IconBuilding } from '@tabler/icons-react';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
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
      <AuthShell eyebrow="Invitation" title={copy.title} lede={copy.body} aside={<TenantAside />}>
        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Invitation" title={`Join ${company}`} aside={<TenantAside />}>
      <div
        className="mb-6 flex items-start gap-3 rounded-panel border p-4 shadow-sm"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <IconBuilding size={18} stroke={1.5} aria-hidden className="mt-0.5 shrink-0 text-warning" />
        <div>
          <p className="t-compact font-medium" style={{ color: 'var(--text-primary)' }}>
            {inviter} invited you to join {company} as {role}.
          </p>
          <p className="t-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
            An agent handles customer messages and has read-only access to settings.
          </p>
        </div>
      </div>

      <form className="grid gap-4" method="post" action={`/api/v1/invitations/accept/${token}`}>
        <Field label="Your name" name="fullName" autoComplete="name" required />

        {/*
          The accept route creates an account, so it enforces the same twelve
          characters as the reset flow. One component, one set of rules, shown
          before submission rather than after.

          No confirm field here: 10 §14's invitation flow is already three
          steps from an email, and a mistyped password on a screen with a
          visible meter is recoverable through the ordinary reset flow.
        */}
        <NewPasswordFields label="Choose a password" showConfirm={false} />

        <Button type="submit" variant="accent" size="lg" className="mt-2 w-full">
          Accept invitation
        </Button>
      </form>
    </AuthShell>
  );
}
