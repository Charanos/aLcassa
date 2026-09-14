import 'server-only';
import { desc, eq, isNull } from 'drizzle-orm';
import { platformAdmins, plans, subscriptions, tenants, userProfiles } from '@/db/schema';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withActorContext } from '@/lib/db';
import { avatarUrlFor } from '@/lib/storage/avatar';
import type { ConsoleAccount, ConsoleWorkspace } from '@/components/console/types';

/**
 * The console CHROME, from the real database — the workspace switcher's list
 * and the account menu's identity.
 *
 * ⚠ THESE TWO WERE STILL MODULE-SCOPE LITERALS IN THE CONSOLE LAYOUT. The
 * file that held them said so plainly and named the queries that would
 * replace them; this is those queries. Everything else on the console —
 * the workspace table, the detail screen, support sessions, the audit log —
 * had already been moved onto live data, which left the chrome as the last
 * place an operator could read a name that was not real. The switcher is
 * the worst possible place for that: it lists workspaces to SWITCH INTO, so
 * a fixture there offers a door to somewhere that does not exist.
 *
 * ⚠ IT RETURNS `null` RATHER THAN THROWING WHEN THERE IS NO PLATFORM
 * SESSION, and the caller falls back to the designed values. That is the
 * same contract `getLiveWorkspaces` and `getLiveIsolationStatus` already
 * use, and it is what keeps the review deployment's demo cookie working:
 * no session, no rows, designed data, nothing crashes.
 *
 * ⚠ WHAT IS STILL NOT HERE: `notices`. There is no notifications table in
 * the schema at all — `grep pgTable src/db/schema` has no candidate — so the
 * console's bell is fixture-backed and honestly cannot be otherwise yet. Its
 * "Mark all read" control was removed for the same reason.
 */

/** "Kilimanjaro Logistics Group Ltd" → "KL". */
function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w));

  if (words.length === 0) return '??';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/**
 * The switcher's list. Newest first and capped — this is a "recent
 * workspaces" menu, not the workspace table, and an operator with 47 tenants
 * does not want all of them in a dropdown. `/platform/tenants` is the
 * complete list and the menu already points at it.
 */
const SWITCHER_LIMIT = 6;

export async function getLiveConsoleChrome(): Promise<{
  workspaces: ConsoleWorkspace[];
  account: ConsoleAccount;
} | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
    const rows = await tx
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        planName: plans.name,
      })
      .from(tenants)
      .leftJoin(subscriptions, eq(subscriptions.tenantId, tenants.id))
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(isNull(tenants.deletedAt))
      .orderBy(desc(tenants.createdAt))
      .limit(SWITCHER_LIMIT);

    const [admin] = await tx
      .select({
        displayName: platformAdmins.displayName,
        /**
         * ⚠ `full_name` WAS NOT BEING READ HERE, AND THAT WAS THE PROPAGATION
         * BUG.
         *
         * Renaming yourself on the profile screen writes `user_profiles.
         * full_name` — deliberately, because rewriting your own entry in the
         * access register is the wrong direction for a security record, and
         * `profile-actions.ts` says so. The profile screen and the admin roster
         * both prefer the profile name when one exists.
         *
         * The chrome did not. It read `platform_admins.display_name` alone, so
         * an operator could rename themselves, see it take on two screens, and
         * keep looking at the old name in the sidebar and the top bar on EVERY
         * screen — the most visible surface of the three, and the last to
         * agree. Same precedence as everywhere else now: profile, then roster,
         * then the session's own label.
         */
        fullName: userProfiles.fullName,
        avatarPath: userProfiles.avatarPath,
        email: userProfiles.email,
        canEnterSupportMode: platformAdmins.canEnterSupportMode,
      })
      .from(platformAdmins)
      .leftJoin(userProfiles, eq(userProfiles.id, platformAdmins.userId))
      .where(eq(platformAdmins.userId, ctx.actorId))
      .limit(1);

    /*
     * `ctx.actorLabel` is the fallback for both fields. The context is
     * resolved and trustworthy even when the `platform_admins` row is missing
     * — which happens for a session that authenticated before the row was
     * written — and showing the operator a blank account menu because a join
     * missed would be worse than showing the label the session already
     * carries.
     */
    const name = admin?.fullName ?? admin?.displayName ?? ctx.actorLabel;

    return {
      workspaces: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        /* A tenant with no subscription row is real and common — every
           workspace is one between provisioning and plan assignment. */
        plan: row.planName ?? 'No plan',
        initials: initialsOf(row.name),
      })),
      account: {
        name,
        email: admin?.email ?? ctx.actorLabel,
        /* The console's own vocabulary, matching the profile card in the
           sidebar foot. Support-mode capability is the one distinction that
           changes what the menu can offer. */
        role: admin?.canEnterSupportMode === false ? 'platform_readonly' : 'platform_admin',
        initials: initialsOf(name),
        /* Null for most accounts, and null is the designed state: `Avatar`
           falls back to the initials beside it, with no network request at
           all. The URL is built rather than signed — see `lib/storage/avatar.ts`
           for why this bucket is public-read, which is what keeps this
           layout-critical read synchronous. */
        avatarUrl: avatarUrlFor(admin?.avatarPath),
      },
    };
  });
}
