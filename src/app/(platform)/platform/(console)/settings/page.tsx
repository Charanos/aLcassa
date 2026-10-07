import type { Metadata } from 'next';
import {
  IconHistory,
  IconLock,
  IconLockOpen,
  IconMail,
  IconShieldCheck,
} from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, DataSource } from '@/components/console/Surface';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { SettingsPanel, type TabKey } from '@/components/console/settings/SettingsPanel';
import { ENFORCED_CONTROLS, PLANNED_CONTROLS } from '@/components/console/settings/controls';
import { getSettings } from '@/lib/console/data';
import { getLiveSettings } from '@/lib/console/liveSettings';
import { fetchBreakGlassState } from '../actions';

export const metadata: Metadata = { title: 'Settings' };

const TAB_KEYS: readonly TabKey[] = ['general', 'security', 'notifications', 'data', 'developer'];

const WHEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Africa/Nairobi',
});

/**
 * Platform settings. `Settings.dc.html`. Doc 23.
 *
 * The question it answers: what is set platform-wide, who changed it last, and
 * what happens if I change it?
 *
 * ⚠ IT USED TO ANSWER NONE OF THEM. Save was disabled because there was no
 * table; the Security tab drew toggles for a two-factor requirement, an IP
 * allow-list and an idle sign-out, none of which exists; Developer listed live
 * API keys and a failing webhook that were fixture data; and the lede said
 * every value "applies to all workspaces" when nothing a workspace sees reads
 * any of them.
 *
 * Now: two fields are stored in `platform_settings` and every save is an
 * audited diff; every statement on the other tabs is either enforced — with
 * where — or listed as not built; and the page says what does and does not
 * read what it stores.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [store, fixture, { tab }, glass] = await Promise.all([
    getLiveSettings(),
    getSettings(),
    searchParams,
    /* ⚠ LIVE, NOT FROM THE FIXTURE — and null without a session, rather than
       a throw that takes the designed view down with it. */
    fetchBreakGlassState().catch(() => null),
  ]);

  const initialTab = TAB_KEYS.includes(tab as TabKey) ? (tab as TabKey) : 'general';
  /* Not a secret: it is the From line of every email the platform sends. */
  const mailFrom = process.env.EMAIL_FROM?.trim() || null;
  /* Mail leaves only with both — see `selectAdapter` in modules/email. The
     key's presence is read, never its value. */
  const mailSends = Boolean(mailFrom && process.env.RESEND_API_KEY?.trim());
  const locked = glass?.locked ?? false;

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Settings' }]}
        title="Settings"
        lede="Manage platform preferences, review access protections and keep a clear record of changes."
      />

      <FactStrip label="Platform settings at a glance">
        <FactCell
          icon={IconHistory}
          label="Last changed"
          value={
            store?.lastChange ? store.lastChange.at.split(',')[0] : store ? 'No changes' : 'Preview'
          }
          note={
            store?.lastChange
              ? `${store.lastChange.by} · ${store.lastChange.at.split(',').slice(1).join(',').trim()}. Recorded in the audit log.`
              : store
                ? 'Not changed since the settings store was created.'
                : 'Sign in as an operator to read the stored row.'
          }
          source={<DataSource kind={store ? 'live' : 'designed'} />}
        />
        <FactCell
          icon={locked ? IconLock : IconLockOpen}
          tone={locked ? 'danger' : 'neutral'}
          label="Support access"
          value={glass === null ? 'Unavailable' : locked ? 'Locked' : 'Available'}
          note={
            locked && glass
              ? `By ${glass.by ?? 'an operator'}${glass.at ? `, ${WHEN.format(glass.at)} EAT` : ''}. Release it under Security.`
              : glass === null
                ? 'Support access could not be read.'
                : 'Reason required. Sessions last up to 30 minutes.'
          }
        />
        <FactCell
          icon={IconShieldCheck}
          tone="success"
          label="Security controls"
          value={`${ENFORCED_CONTROLS.length} enforced`}
          note={`${PLANNED_CONTROLS.length} additional protections are not available yet.`}
        />
        <FactCell
          icon={IconMail}
          tone={mailSends ? 'neutral' : 'warning'}
          label="Outgoing mail"
          value={mailSends ? 'Configured' : 'Not configured'}
          note={
            mailSends
              ? 'Sender and provider configured. Delivery readiness is verified separately.'
              : mailFrom
                ? 'An email provider is needed before messages can be sent.'
                : 'A sender address is needed before messages can be sent.'
          }
        />
      </FactStrip>

      <div className="mt-10">
        <SettingsPanel
          store={store}
          fixture={fixture}
          mailFrom={mailFrom}
          initialTab={initialTab}
          breakGlass={{
            active: locked,
            by: glass?.by ?? null,
            at: glass?.at
              ? new Intl.DateTimeFormat('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Africa/Nairobi',
                }).format(glass.at)
              : null,
            reason: glass?.reason ?? null,
          }}
        />
      </div>
    </ConsolePage>
  );
}
