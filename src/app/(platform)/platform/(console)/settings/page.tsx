import type { Metadata } from 'next';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { SettingsPanel } from '@/components/console/SettingsPanel';
import { getSettings, PORTFOLIO_COUNT } from '@/lib/console/data';
import { fetchBreakGlassState } from '../actions';

export const metadata: Metadata = { title: 'Settings' };

const TAB_KEYS = ['general', 'security', 'notifications', 'data', 'developer'] as const;

/**
 * Platform settings. `Settings.dc.html`.
 *
 * The lede states the one fact that makes this screen different from every
 * other form in the console: "everything here applies to all N workspaces
 * unless a workspace overrides it." A typo in the support address is not a
 * cosmetic mistake on this page — it is what every customer of every workspace
 * sees the next time something goes wrong.
 *
 * The count is derived rather than typed. It was a literal here, in the rail
 * badge, in a notification and in the tenant rules tab: four places to be
 * wrong about how many customers the business has, and no way to notice.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  /* ⚠ THE LOCK IS READ LIVE, NOT TAKEN FROM THE FIXTURE.
     `getSettings().breakGlassActive` is a hardcoded `false`. It always was —
     which was harmless while the control refused to do anything, and is a
     correctness bug the moment the control works: an operator arriving at a
     locked platform would have been shown "Suspend all support-session
     access" and a button offering to do what had already been done. */
  const [model, { tab }, glass] = await Promise.all([
    getSettings(),
    searchParams,
    fetchBreakGlassState(),
  ]);

  const initialTab = TAB_KEYS.includes(tab as (typeof TAB_KEYS)[number])
    ? (tab as (typeof TAB_KEYS)[number])
    : 'general';

  return (
    <ConsolePage>
      <div className="border-b pb-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <ConsoleHeader eyebrow="/platform/settings" title="Settings" />
        <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          Platform-wide defaults. Everything here applies to all {PORTFOLIO_COUNT} workspaces unless
          a workspace overrides it.
        </p>
      </div>

      <div className="mt-5">
        <SettingsPanel
          model={{ ...model, breakGlassActive: glass.locked }}
          initialTab={initialTab}
          lockedBy={glass.by}
          lockedAt={
            glass.at
              ? new Intl.DateTimeFormat('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Africa/Nairobi',
                }).format(glass.at)
              : null
          }
          lockedReason={glass.reason}
        />
      </div>
    </ConsolePage>
  );
}
