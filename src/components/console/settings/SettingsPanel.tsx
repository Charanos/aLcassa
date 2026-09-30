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
    <div className="grid gap-6 lg:grid-cols-[188px_minmax(0,1fr)] lg:gap-8">
      {/* A rail on a desktop, a scrolling row on a phone — where a 188px
          column beside the form left the form 150px to work in. */}
      <div
        role="tablist"
        aria-label="Settings sections"
        onKeyDown={(e) => {
          /* The tabs pattern: arrows move between tabs, in either
             orientation, since the rail is a row on a phone. */
          const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
          if (!step) return;
          e.preventDefault();
          const i = TABS.findIndex((t) => t.key === tab);
          const next = TABS[(i + step + TABS.length) % TABS.length];
          if (!next) return;
          setTab(next.key);
          document.getElementById(`settings-tab-${next.key}`)?.focus();
        }}
        className="-mx-4 flex min-w-0 gap-1 overflow-x-auto px-4 pb-1 lg:sticky lg:top-6 lg:mx-0 lg:grid lg:content-start lg:gap-0.5 lg:self-start lg:overflow-visible lg:px-0 lg:pb-0"
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
              className="relative flex h-9 shrink-0 items-center gap-2.5 rounded-panel px-3 text-left whitespace-nowrap transition-colors lg:px-2.5"
              style={{
                background: on ? 'var(--surface-inset)' : 'transparent',
                color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                font: `${on ? 500 : 400} var(--type-compact)/1 var(--font-ui)`,
              }}
            >
              <span
                aria-hidden
                className="absolute top-2 bottom-2 left-0 hidden w-0.5 rounded-full lg:block"
                style={{ background: on ? 'var(--blue-500)' : 'transparent' }}
              />
              <Icon size={16} stroke={1.5} className="shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{t.label}</span>
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
      className="grid grid-cols-[minmax(0,1fr)] gap-5"
    >
      {children}
    </div>
  );
}
