import type { Metadata } from 'next';
import Link from '@/components/structure/NavigationLink';
import { PageHeader } from '@/components/structure/PageHeader';
import { Button } from '@/components/primitives/Button';
import { TeamPanel } from '@/components/tenant/TeamPanel';
import { getTeam } from '@/lib/tenant/data';
import { getLiveTeam } from '@/lib/tenant/live';
import { currentSessionOrNull } from '@/lib/auth/resolve';

export const metadata: Metadata = { title: 'Team' };

/** 02 §4. Members, roles, pending invitations, revoke. Owner and admin.
 *  08 §2: seats count active members PLUS pending invitations, so the limit
 *  bar reads the same total the invite form's own guard will check. */
export default async function TeamSettingsPage() {
  /** Authenticated readers use live workspace data; fixtures are limited to explicit demo sessions. */
  const ctx = await currentSessionOrNull();
  const model = (await getLiveTeam(ctx ?? undefined)) ?? (await getTeam());

  return (
    <div>
      <PageHeader
        title="Team"
        description="Everyone with access to this workspace, and everyone waiting to join it."
        breadcrumbs={[{ label: 'Settings', href: '/app/settings/company' }, { label: 'Team' }]}
        actions={
          ctx && ['owner', 'admin', 'support'].includes(ctx.role) ? (
            <Button asChild variant="primary">
              <Link href="/app/settings/team/invite">Invite a teammate</Link>
            </Button>
          ) : null
        }
      />

      <TeamPanel model={model} role={ctx?.role ?? null} />
    </div>
  );
}
