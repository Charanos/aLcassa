import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { ProfileForm } from '@/components/tenant/ProfileForm';
import { getAccount } from '@/lib/tenant/data';
import { getLiveAccount } from '@/lib/tenant/live';

export const metadata: Metadata = { title: 'Your account' };

/** 02 §4. The signed-in user: name, email, password, sessions. Every role. */
export default async function AccountPage() {
  const model = (await getLiveAccount()) ?? (await getAccount());

  return (
    <div>
      <PageHeader title="Your account" breadcrumbs={[{ label: 'Your account' }]} />
      <ProfileForm profile={model.profile} />
    </div>
  );
}
