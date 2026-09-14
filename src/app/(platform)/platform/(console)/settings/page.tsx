import type { Metadata } from 'next';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { SettingsPanel } from '@/components/console/SettingsPanel';
import { getSettings, PORTFOLIO_COUNT } from '@/lib/console/data';

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
  const [model, { tab }] = await Promise.all([getSettings(), searchParams]);

  const initialTab = TAB_KEYS.includes(tab as (typeof TAB_KEYS)[number])
    ? (tab as (typeof TAB_KEYS)[number])
    : 'general';

  return (
    <ConsolePage>
      <div className="border-b pb-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <ConsoleHeader eyebrow="/platform/settings" title="Settings" />
        <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          Platform-wide defaults. Everything here applies to all {PORTFOLIO_COUNT} workspaces
          unless a workspace overrides it.
        </p>
      </div>

      <div className="mt-5">
        <SettingsPanel model={model} initialTab={initialTab} />
      </div>
    </ConsolePage>
  );
}
