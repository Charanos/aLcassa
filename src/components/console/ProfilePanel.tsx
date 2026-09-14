import type { ProfileModel } from '@/lib/console/data';
import { AccessRail } from '@/components/console/profile/AccessRail';
import { LimitsCard } from '@/components/console/profile/LimitsCard';
import { ProfileForm } from '@/components/console/profile/ProfileForm';
import { SecurityList } from '@/components/console/profile/SecurityList';
import { PreviewNotice } from '@/components/console/profile/PreviewNotice';
import { SessionList } from '@/components/console/profile/SessionList';

/**
 * The signed-in operator's own profile. `Profile.dc.html`.
 *
 * ⚠ THIS FILE WAS 477 LINES AND `'use client'`. IT IS NOW A SERVER COMPONENT
 * THAT COMPOSES SIX, and that is step 1 of the playbook applied to this
 * surface.
 *
 * The old shape put a `'use client'` directive at the top of the entire screen
 * to obtain one text input and two buttons. Everything else — a security
 * checklist that never changes, a capability list, three sentences of static
 * prose, every device row's markup — was serialised into the browser payload
 * and hydrated to sit there being static.
 *
 * ⚠ AND THE CARDS BELOW STAY SERVER COMPONENTS EVEN THOUGH A CLIENT COMPONENT
 * WRAPS THEM. `SecurityList`, `SessionList`, `AccessRail` and `LimitsCard` are
 * rendered HERE, on the server, and passed into `ProfileForm` as the `main` and
 * `rail` props. A client component rendering `{props.children}` never inspects
 * or re-renders that tree — it arrives as already-rendered output. That is what
 * lets the page have a page-level unsaved-changes bar, which needs the draft
 * state above every card, without dragging every card across the boundary.
 *
 * The client code on this screen is: the name field, the avatar picker, the two
 * revoke controls, the pager, and the bar. Nothing else.
 *
 * ⚠ CARDED, NOT UNCARDED. 03 §26 · 18 §14, decided once, before any state was
 * designed — because empty, loading and error states all inherit the container,
 * and settling the container afterwards means drawing every one of them twice.
 *
 * The console's default is uncarded: a hairline and whitespace, content on the
 * page ground, which is right for a single-subject working screen where the
 * page IS the panel. This is not that screen. It is four unrelated subjects
 * stacked — who you are, what protects the account, what is signed in, what you
 * are permitted — and uncarded, a reader cannot tell where the security list
 * ends and the device list begins, because a hairline BETWEEN two sections
 * looks exactly like a hairline INSIDE one. Both of those sections are lists of
 * hairline-separated rows, so the ambiguity is not hypothetical here; it is the
 * page's dominant texture.
 *
 * It uses `SettingsSection` rather than `Panel variant="elevated"`. Both are
 * cards; a settings section carries a standfirst and a band does not. See
 * `Surface.tsx` for which to reach for.
 */
export function ProfilePanel({
  model,
  /**
   * The model came from the database rather than from the fixture.
   *
   * ⚠ FALSE MEANS EVERY WRITE ON THIS PAGE WILL BE REFUSED, and the page has to
   * act on that BEFORE anything is pressed. See `PreviewNotice` for how the
   * state arises — a platform cookie that outlived its Supabase session — and
   * why it used to be completely invisible.
   */
  live,
}: {
  model: ProfileModel;
  live: boolean;
}) {
  return (
    <>
      {live ? null : <PreviewNotice />}

      <ProfileForm
        name={model.name}
        email={model.email}
        emailVerified={model.emailVerified}
        initials={model.initials}
        avatarUrl={model.avatarUrl}
        live={live}
        main={
          <>
            <SecurityList items={model.security} />
            <SessionList sessions={model.sessions} hidden={model.sessionsHidden} live={live} />
          </>
        }
        rail={
          <>
            <AccessRail role={model.role} capabilities={model.capabilities} facts={model.facts} />
            <LimitsCard />
          </>
        }
      />
    </>
  );
}
