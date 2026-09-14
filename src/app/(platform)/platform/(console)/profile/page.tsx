import type { Metadata } from 'next';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { ProfilePanel } from '@/components/console/ProfilePanel';
import { getProfile } from '@/lib/console/data';
import { getLiveProfile } from '@/lib/console/liveOperators';

export const metadata: Metadata = { title: 'Your profile' };

export default async function ProfilePage() {
  /**
   * Live first, designed fixture second — the pattern every other wired surface
   * uses. The fixture stays reachable behind the review bypass, where there is
   * no session for the live reader to resolve.
   *
   * ⚠ WHICH READER ANSWERED IS NOW PART OF THE MODEL, AND IT HAD TO BECOME SO.
   *
   * `?? getProfile()` is the right fallback and it was hiding a genuinely bad
   * state. The middleware admits anyone holding the platform cookie; the live
   * reader needs a resolvable SUPABASE session as well. Those two can come
   * apart — the cookie outlives the identity provider's token — and when they
   * did, the console rendered the DESIGNED profile with no indication of it:
   * somebody else's name, a fabricated "Admin since 14 Mar 2025", three
   * invented devices, all presented as the reader's own account.
   *
   * Every control on the page then failed on click, with an auth error, because
   * the actions resolve the session properly and correctly refused.
   *
   * That is the worst arrangement available. A screen that cannot write must
   * say so BEFORE it is pressed, and a screen showing designed data must not
   * let it be mistaken for a record. `live` carries the answer, `ProfilePanel`
   * disables every write behind a stated reason, and the banner offers the one
   * action that actually resolves it.
   *
   * ⚠ NO `<Suspense>` HERE. 18 §13: a boundary around a value the page has
   * already awaited boundaries nothing — the await happens before the JSX is
   * constructed, so the fallback can never render. This page reads one model
   * and has nothing to stream, so the route's `loading.tsx` is the whole of its
   * loading story, and that file mirrors this layout.
   */
  const live = await getLiveProfile();
  const model = live ?? (await getProfile());

  return (
    <ConsolePage>
      {/*
        ⚠ BREADCRUMBS, NOT JUST AN EYEBROW. The overview and every screen in the
        tenant application carry them; the profile had only the mono route path,
        which says where you are and offers no way back. This screen is reached
        from the account menu rather than from the navigation, so it is the one
        console page a reader can arrive at with no sense of where it sits — the
        crumb to the console is the way out.
      */}
      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'profile' }]}
        title="Your profile"
        rule
      />
      <ProfilePanel model={model} live={live !== null} />
    </ConsolePage>
  );
}
