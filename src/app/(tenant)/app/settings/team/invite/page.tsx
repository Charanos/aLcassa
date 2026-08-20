import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { InviteForm } from '@/components/tenant/InviteForm';
import { getTeam } from '@/lib/tenant/data';

export const metadata: Metadata = { title: 'Invite a teammate' };

/** 02 §4. Send an invitation. Owner and admin. */
export default async function InviteTeamMemberPage() {
  const model = await getTeam();
  const pendingCount = model.invitations.filter((i) => i.status === 'pending').length;
  const seatsRemaining =
    model.seatsLimit === null ? null : Math.max(0, model.seatsLimit - model.members.length - pendingCount);

  return (
    <div>
      <PageHeader
        title="Invite a teammate"
        description="They receive an email with a link valid for seven days."
        breadcrumbs={[
          { label: 'Settings', href: '/app/settings/company' },
          { label: 'Team', href: '/app/settings/team' },
          { label: 'Invite' },
        ]}
      />
      <InviteForm seatsRemaining={seatsRemaining} />
    </div>
  );
}
