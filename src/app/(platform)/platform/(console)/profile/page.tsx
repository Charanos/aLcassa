import type { Metadata } from 'next';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { ProfilePanel } from '@/components/console/ProfilePanel';
import { getProfile } from '@/lib/console/data';
import { getLiveProfile } from '@/lib/console/liveOperators';

export const metadata: Metadata = { title: 'Your profile' };

export default async function ProfilePage() {
  /** Use the live profile for authenticated operators and explicit demo data for review; surface expired identity sessions separately. */
  const live = await getLiveProfile();
  const model = live ?? (await getProfile());

  return (
    <ConsolePage>
      {/* Provide a console breadcrumb because profile is reached outside the main navigation. */}
      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'profile' }]}
        title="Your profile"
        rule
      />
      <ProfilePanel model={model} live={live !== null} />
    </ConsolePage>
  );
}
