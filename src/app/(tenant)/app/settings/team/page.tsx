import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/structure/PageHeader';
import { Button } from '@/components/primitives/Button';
import { LimitBar } from '@/components/domain/LimitBar';
import { TeamPanel } from '@/components/tenant/TeamPanel';
import { getTeam } from '@/lib/tenant/data';
import { getLiveTeam } from '@/lib/tenant/live';

export const metadata: Metadata = { title: 'Team' };

/** 02 §4. Members, roles, pending invitations, revoke. Owner and admin.
 *  08 §2: seats count active members PLUS pending invitations, so the limit
 *  bar reads the same total the invite form's own guard will check. */
export default async function TeamSettingsPage() {
/**
 * ⚠ LIVE FIRST, FIXTURE SECOND, AND THE ORDER IS THE WHOLE POINT.
 *
 * `getLive*` answers null when there is no real session — which is what the
 * review deployment's demo cookie produces. A signed-in person therefore sees
 * their own workspace; a reviewer clicking the demo button sees the designed
 * data. Neither is ever shown the other's, and no screen has to decide which
 * mode it is in.
 */
  const model = (await getLiveTeam()) ?? (await getTeam());
  const pendingCount = model.invitations.filter((i) => i.status === 'pending').length;

  return (
    <div>
      <PageHeader
        title="Team"
        description="Everyone with access to this workspace, and everyone waiting to join it."
        breadcrumbs={[{ label: 'Settings', href: '/app/settings/company' }, { label: 'Team' }]}
        actions={
          <Button asChild variant="primary">
            <Link href="/app/settings/team/invite">Invite a teammate</Link>
          </Button>
        }
      />

      <div className="mb-6 max-w-sm">
        <LimitBar
          label={`Seats (${model.members.length} active${pendingCount ? ` + ${pendingCount} pending` : ''})`}
          current={model.seatsUsed}
          limit={model.seatsLimit}
        />
      </div>

      <TeamPanel members={model.members} invitations={model.invitations} />
    </div>
  );
}
