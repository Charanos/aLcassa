'use client';

import { useState } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconBell,
  IconCode,
  IconDatabase,
  IconShieldLock,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import type { SettingsModel } from '@/lib/console/data';
import type { LiveSettings } from '@/lib/console/liveSettings';
import { SectionHeading } from '../Surface';
import { BreakGlassPanel } from './BreakGlassPanel';
import { GeneralTab } from './GeneralTab';
import {
  DataStatements,
  DeveloperStatements,
  NotificationStatements,
  SecurityStatements,
} from './StatementTabs';

/**
 * The platform settings panel. `Settings.dc.html`.
 *
 * ⚠ TABS ARE LOCAL STATE, NOT URL STATE — the opposite call from Workspace
 * Detail (15-spec-delta C9). `initialTab` is read from the search param once,
 * so the header's "Notification settings" link lands on that tab, and a switch
 * after that never remounts the page.
 *
 * ⚠ EVERY TAB STAYS MOUNTED; INACTIVE ONES ARE `hidden`. General is the only
 * tab that edits, and an edit there must survive a look at Security — the old
 * panel promised "switching tabs never loses work" and kept the promise by
 * lifting every field into one component. Hiding rather than unmounting keeps
 * it with the state where it belongs, and gives each tab a real `tabpanel`.
 */

export type TabKey = 'general' | 'security' | 'notifications' | 'data' | 'developer';

const TABS: Array<{ key: TabKey; label: string; icon: TablerIcon }> = [
  { key: 'general', label: 'General', icon: IconAdjustmentsHorizontal },
  { key: 'security', label: 'Security', icon: IconShieldLock },
  { key: 'notifications', label: 'Notifications', icon: IconBell },
  { key: 'data', label: 'Data', icon: IconDatabase },
  { key: 'developer', label: 'Developer', icon: IconCode },
];

const CONTEXT: Record<TabKey, { title: string; detail: string }> = {
  general: {
    title: 'Platform identity',
    detail: 'Manage stored preferences and review each change before saving.',
  },
  security: {
    title: 'Access & safeguards',
    detail: 'Review operator protections and control emergency support access.',
  },
  notifications: {
    title: 'Notification channels',
    detail: 'See the proposed alerts and delivery channels. Preferences are not available yet.',
  },
  data: {
    title: 'Records & exports',
    detail: 'Understand retention and download the platform records you need.',
  },
  developer: {
    title: 'Integration access',
    detail: 'Review workspace credentials and the availability of platform integrations.',
  },
};

export function SettingsPanel({
  store,
  fixture,
  mailFrom,
  initialTab,
  breakGlass,
}: {
  store: LiveSettings | null;
  fixture: SettingsModel;
  mailFrom: string | null;
  initialTab: TabKey;
  breakGlass: {
    active: boolean;
    by: string | null;
    at: string | null;
    reason: string | null;
  };
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [generalDirty, setGeneralDirty] = useState(false);

  return (
    <div className="min-w-0">
      {/* A rail on a desktop, a scrolling row on a phone — where a 188px
          column beside the form left the form 150px to work in. */}
      <div
        role="tablist"
        aria-label="Settings sections"
        aria-orientation="horizontal"
        onKeyDown={(e) => {
          /* The tabs pattern: arrows move between tabs, in either
             orientation, since the rail is a row on a phone. */
          const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
          if (!step && e.key !== 'Home' && e.key !== 'End') return;
          e.preventDefault();
          const i = TABS.findIndex((t) => t.key === tab);
          const next =
            TABS[
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? TABS.length - 1
                  : (i + (step ?? 0) + TABS.length) % TABS.length
            ];
          if (!next) return;
          setTab(next.key);
          document.getElementById(`settings-tab-${next.key}`)?.focus();
        }}
        className="console-tab-rail"
      >
        {TABS.map((t) => {
          const on = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              id={`settings-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              aria-controls={`settings-panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className="console-tab"
            >
              <Icon size={14} stroke={1.5} className="shrink-0" aria-hidden />
              <span>{t.label}</span>
              {t.key === 'general' && generalDirty ? (
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: 'var(--blue-500)' }}
                  aria-label="unsaved changes"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <SectionHeading title={CONTEXT[tab].title} note={CONTEXT[tab].detail} align="right" />
      <div className="min-w-0">
        <Panel tab="general" active={tab}>
          {/* Keyed on the stored version: after a save or a reload the form's
              baseline is the row as stored, not what was typed. */}
          <GeneralTab
            key={store?.updatedAt ?? 'designed'}
            store={store}
            fixture={fixture}
            mailFrom={mailFrom}
            onDirtyChange={setGeneralDirty}
          />
        </Panel>
        <Panel tab="security" active={tab}>
          <SecurityStatements />
          <BreakGlassPanel
            initialActive={breakGlass.active}
            lockedBy={breakGlass.by}
            lockedAt={breakGlass.at}
            lockedReason={breakGlass.reason}
          />
        </Panel>
        <Panel tab="notifications" active={tab}>
          <NotificationStatements />
        </Panel>
        <Panel tab="data" active={tab}>
          <DataStatements exports={fixture.exports} />
        </Panel>
        <Panel tab="developer" active={tab}>
          <DeveloperStatements />
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  tab,
  active,
  children,
}: {
  tab: TabKey;
  active: TabKey;
  children: React.ReactNode;
}) {
  return (
    <div
      id={`settings-panel-${tab}`}
      role="tabpanel"
      aria-labelledby={`settings-tab-${tab}`}
      hidden={tab !== active}
      /* One `minmax(0,1fr)` track, so nothing inside can widen the column
         past the page — the failure a phone found once already. */
      className={tab === active ? 'grid grid-cols-[minmax(0,1fr)] gap-8' : 'hidden'}
    >
      {children}
    </div>
  );
}
