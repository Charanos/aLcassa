import type { Metadata } from 'next';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { ProfilePanel } from '@/components/console/ProfilePanel';
import { getProfile } from '@/lib/console/data';
import { getLiveProfile } from '@/lib/console/liveOperators';

export const metadata: Metadata = { title: 'Your profile' };

export default async function ProfilePage() {
  /**
   * Live first, designed fixture second — the pattern every other wired
   * surface uses. The fixture stays reachable behind the review bypass, where
   * there is no session for the live reader to resolve.
   *
   * ⚠ THE DEVICE LIST IS NOW REAL, AND STILL CANNOT REVOKE. That gap is
   * deliberate and tracked (17 §6.3) rather than papered over: a list of real
   * sessions with a dead button is at least honest about what it shows, where
   * a list of drawn sessions with a dead button was two untruths.
   */
  const model = (await getLiveProfile()) ?? (await getProfile());

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
