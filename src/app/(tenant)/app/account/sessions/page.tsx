import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { SessionsList } from '@/components/tenant/SessionsList';
import { getAccountSessions } from '@/lib/tenant/data';
import { getLiveAccountSessions } from '@/lib/tenant/live';

export const metadata: Metadata = { title: 'Sessions' };

/** 02 §4. Active sessions, revoke individually or all. Every role. */
export default async function AccountSessionsPage() {
  const model = (await getLiveAccountSessions()) ?? (await getAccountSessions());

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="Everywhere you are currently signed in."
        breadcrumbs={[{ label: 'Your account', href: '/app/account' }, { label: 'Sessions' }]}
      />
      <SessionsList sessions={model.sessions} />
    </div>
  );
}
