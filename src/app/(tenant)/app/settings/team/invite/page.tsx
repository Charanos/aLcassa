import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { InviteForm } from '@/components/tenant/InviteForm';
import { getTeam } from '@/lib/tenant/data';
import { getLiveTeam } from '@/lib/tenant/live';
import { currentSessionOrNull } from '@/lib/auth/resolve';
import { emailIsConfigured } from '@/modules/email';
import { loadMe } from '@/modules/identity';

export const metadata: Metadata = { title: 'Invite a teammate' };

/** 02 §4. Send an invitation. Owner and admin. */
export default async function InviteTeamMemberPage() {
  const model = (await getLiveTeam()) ?? (await getTeam());

  // The plan name, so the seat warning names a tier that exists. This
  // component used to say "Growth", which was never one of ours.
  const ctx = await currentSessionOrNull();
  const me = ctx ? await loadMe(ctx) : null;
  const seatsRemaining =
    model.seatsLimit === null ? null : Math.max(0, model.seatsLimit - model.seatsUsed);

  return (
    <div>
      <PageHeader
        title="Invite a teammate"
        /* Describe invitation delivery according to the configured mail provider. */
        description={
          emailIsConfigured()
            ? 'They receive an email with a link valid for seven days.'
            : 'No email provider is configured here, so you will be given a link to send them yourself. It is valid for seven days.'
        }
        breadcrumbs={[
          { label: 'Settings', href: '/app/settings/company' },
          { label: 'Team', href: '/app/settings/team' },
          { label: 'Invite' },
        ]}
      />
      {ctx && ['owner', 'admin', 'support'].includes(ctx.role) ? (
        <InviteForm seatsRemaining={seatsRemaining} planName={me?.subscription?.planName} />
      ) : (
        <p role="status" className="t-body text-[var(--text-secondary)]">
          Your workspace role does not allow invitations. Ask the owner or an administrator to
          invite your teammate.
        </p>
      )}
    </div>
  );
}
