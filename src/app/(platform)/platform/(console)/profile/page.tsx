import type { Metadata } from 'next';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { ProfilePanel } from '@/components/console/ProfilePanel';
import { getProfile } from '@/lib/console/data';

export const metadata: Metadata = { title: 'Your profile' };

export default async function ProfilePage() {
  const model = await getProfile();

  return (
    <ConsolePage>
      <div className="border-b pb-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <ConsoleHeader eyebrow="/platform/profile" title="Your profile" />
      </div>

      <div className="mt-6">
        <ProfilePanel model={model} />
      </div>
    </ConsolePage>
  );
}
