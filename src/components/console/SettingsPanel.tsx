'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconBell,
  IconCode,
  IconDatabase,
  IconDeviceDesktop,
  IconDownload,
  IconMoon,
  IconShieldLock,
  IconSun,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme-shared';
import type { SettingsModel } from '@/lib/console/data';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { toggleBreakGlass } from '@/app/(platform)/platform/(console)/actions';
import * as Switch from '@radix-ui/react-switch';

/**
 * The platform settings panel. `Settings.dc.html`.
 *
 * ⚠ TABS ARE LOCAL STATE, NOT URL STATE — the opposite call from Workspace
 * Detail (15-spec-delta C9), and for the opposite reason.
 *
 * Workspace Detail's tabs are independent enough to deep-link: someone writes
 * "check the billing tab" in a support ticket and the link should land there.
 * These five tabs are quadrants of ONE form with ONE sticky save footer at the
 * bottom — the design saves every dirty field across every section in a single
 * action. Routing a tab switch through the URL risks a remount that would
 * discard an edit in a section the operator isn't currently looking at, for a
 * deep-link benefit nobody asks for on a settings page. Local state guarantees
 * the one thing that actually matters here: switching tabs never loses work.
 *
 * The `initialTab` prop is still read from a search param once, on mount, so
 * the header's "Notification settings" link can jump straight to that section
 * on first load without paying the remount risk on every subsequent click.
 */

type TabKey = 'general' | 'security' | 'notifications' | 'data' | 'developer';

const TABS: Array<{ key: TabKey; label: string; icon: TablerIcon }> = [
  { key: 'general', label: 'General', icon: IconAdjustmentsHorizontal },
  { key: 'security', label: 'Security', icon: IconShieldLock },
  { key: 'notifications', label: 'Notifications', icon: IconBell },
  { key: 'data', label: 'Data', icon: IconDatabase },
  { key: 'developer', label: 'Developer', icon: IconCode },
];

type SaveState = 'idle' | 'saved';

export function SettingsPanel({
  model,
  initialTab,
  themePreference,
}: {
  model: SettingsModel;
  initialTab: TabKey;
  themePreference: ThemePreference;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [platformName, setPlatformName] = useState(model.platformName);
  const [supportEmail, setSupportEmail] = useState(model.supportEmail);
  const [policyOverrides, setPolicyOverrides] = useState<Record<string, boolean>>({});
  const [notifyOverrides, setNotifyOverrides] = useState<
    Record<string, { console: boolean; email: boolean }>
  >({});
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const dirty =
    platformName !== model.platformName ||
    supportEmail !== model.supportEmail ||
    Object.keys(policyOverrides).length > 0 ||
    Object.keys(notifyOverrides).length > 0;

  function save() {
    if (!dirty) return;
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2600);
  }

  function discard() {
    setPlatformName(model.platformName);
    setSupportEmail(model.supportEmail);
    setPolicyOverrides({});
    setNotifyOverrides({});
    setSaveState('idle');
  }

  return (
    <div className="grid gap-7" style={{ gridTemplateColumns: 'minmax(0,188px) minmax(0,1fr)' }}>
      <nav aria-label="Settings sections" className="sticky top-6 grid content-start gap-0.5">
        {TABS.map((t) => {
          const on = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={on ? 'true' : undefined}
              className="relative flex h-[34px] items-center gap-2.5 rounded-panel px-2.5 text-left transition-colors"
              style={{
                background: on ? 'var(--surface-inset)' : 'transparent',
                color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                font: `${on ? 500 : 400} var(--text-sm)/1 var(--font-ui)`,
              }}
            >
              <span
                aria-hidden
                className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full"
                style={{ background: on ? 'var(--blue-500)' : 'transparent' }}
              />
              <Icon size={16} stroke={1.5} className="shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="grid gap-5">
        {tab === 'general' ? (
          <>
            <section
              className="rounded-overlay p-5"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <p className="t-eyebrow mb-5" style={{ color: 'var(--text-tertiary)' }}>
                Platform identity
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Platform name">
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="t-body h-[38px] w-full rounded-chip px-3 outline-none"
                    style={{
                      border: '1px solid var(--border-strong)',
                      background: 'var(--surface-raised)',
                      boxShadow: 'var(--neu-inset)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </Field>
                <Field label="Support address">
                  <input
                    type="text"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="h-[38px] w-full rounded-chip px-3 outline-none"
                    style={{
                      border: '1px solid var(--border-strong)',
                      background: 'var(--surface-raised)',
                      boxShadow: 'var(--neu-inset)',
                      font: '400 var(--text-base)/1 var(--font-mono)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </Field>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Default currency" value={model.currency} />
                <ReadOnlyField label="Platform timezone" value={model.timezone} />
              </div>
              <p className="t-caption mt-3.5" style={{ color: 'var(--text-tertiary)' }}>
                Audit timestamps are stored in UTC regardless of this setting, and rendered in your
                local zone.
              </p>
            </section>

            <ThemeSection initialPreference={themePreference} />
          </>
        ) : null}

        {tab === 'security' ? (
          <>
            <section
              className="rounded-overlay p-5"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <p className="t-eyebrow mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Access policy
              </p>
              <p className="t-caption mb-1" style={{ color: 'var(--text-secondary)' }}>
                These bind every platform admin, including you.
              </p>
              <div>
                {model.policies.map((p, i) => {
                  const on = policyOverrides[p.key] ?? p.on;
                  const locked = Boolean(p.locked);
                  return (
                    <div
                      key={p.key}
                      className="flex items-start gap-3.5 py-3.5"
                      style={{
                        borderBottom:
                          i === model.policies.length - 1
                            ? undefined
                            : '1px solid var(--border-subtle)',
                      }}
                    >
                      <Toggle
                        on={on}
                        locked={locked}
                        label={p.label}
                        onToggle={() =>
                          setPolicyOverrides((prev) => {
                            const next = { ...prev };
                            if ((next[p.key] ?? p.on) !== p.on) delete next[p.key];
                            else next[p.key] = !p.on;
                            return next;
                          })
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className="t-compact"
                            style={{ color: on ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                          >
                            {p.label}
                          </span>
                          {locked ? (
                            <span
                              className="inline-flex h-[19px] items-center rounded-full px-1.5"
                              style={{
                                background: 'var(--surface-inset)',
                                font: '500 10px/1 var(--font-mono)',
                                letterSpacing: '0.08em',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              ENFORCED
                            </span>
                          ) : null}
                        </span>
                        <span
                          className="t-caption mt-1 block"
                          style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
                        >
                          {p.detail}
                        </span>
                      </span>
                      {p.value ? (
                        <span
                          className="numeric inline-flex h-7 shrink-0 items-center rounded-chip px-2.5"
                          style={{
                            border: '1px solid var(--border-strong)',
                            background: 'var(--surface-sunken)',
                            fontSize: 12,
                          }}
                        >
                          {p.value}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <BreakGlassPanel initialActive={model.breakGlassActive} />
          </>
        ) : null}

        {tab === 'notifications' ? (
          <section
            className="overflow-hidden rounded-overlay"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-raised)',
              boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
            }}
          >
            <div
              className="grid items-center gap-0 px-5 py-3.5"
              style={{
                gridTemplateColumns: 'minmax(0,1fr) 84px 84px',
                background: 'var(--surface-sunken)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                Notify me when
              </span>
              <span
                className="text-center"
                style={{
                  font: '500 10.5px/1 var(--font-mono)',
                  letterSpacing: '0.08em',
                  color: 'var(--text-tertiary)',
                }}
              >
                CONSOLE
              </span>
              <span
                className="text-center"
                style={{
                  font: '500 10.5px/1 var(--font-mono)',
                  letterSpacing: '0.08em',
                  color: 'var(--text-tertiary)',
                }}
              >
                EMAIL
              </span>
            </div>
            {model.notifications.map((n, i) => {
              const st = notifyOverrides[n.key] ?? { console: n.console, email: n.email };
              const locked = Boolean(n.locked);
              return (
                <div
                  key={n.key}
                  className="grid items-center gap-0 px-5 py-3.5"
                  style={{
                    gridTemplateColumns: 'minmax(0,1fr) 84px 84px',
                    borderBottom:
                      i === model.notifications.length - 1
                        ? undefined
                        : '1px solid var(--border-subtle)',
                  }}
                >
                  <span className="min-w-0 pr-4">
                    <span className="t-compact block" style={{ color: 'var(--text-primary)' }}>
                      {n.label}
                    </span>
                    <span
                      className="t-caption mt-0.5 block"
                      style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
                    >
                      {n.detail}
                    </span>
                  </span>
                  <span className="grid place-items-center">
                    <Toggle
                      on={st.console}
                      locked={locked}
                      label={`${n.label} · console`}
                      onToggle={() =>
                        setNotifyOverrides((prev) => ({
                          ...prev,
                          [n.key]: { ...st, console: !st.console },
                        }))
                      }
                    />
                  </span>
                  <span className="grid place-items-center">
                    <Toggle
                      on={st.email}
                      locked={locked}
                      label={`${n.label} · email`}
                      onToggle={() =>
                        setNotifyOverrides((prev) => ({
                          ...prev,
                          [n.key]: { ...st, email: !st.email },
                        }))
                      }
                    />
                  </span>
                </div>
              );
            })}
            <div className="px-5 py-3.5" style={{ background: 'var(--surface-sunken)' }}>
              <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
                Incidents at SEV1 always page the on-call engineer regardless of these settings.
              </p>
            </div>
          </section>
        ) : null}

        {tab === 'data' ? (
          <>
            <section
              className="rounded-overlay p-5"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <p className="t-eyebrow mb-5" style={{ color: 'var(--text-tertiary)' }}>
                Retention
              </p>
              <div className="grid gap-3.5">
                {model.retention.map((r) => (
                  <div
                    key={r.label}
                    className="flex flex-col gap-2 rounded-panel px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4"
                    style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="t-compact block" style={{ color: 'var(--text-primary)' }}>
                        {r.label}
                      </span>
                      <span className="t-caption mt-0.5 block" style={{ color: 'var(--text-secondary)' }}>
                        {r.detail}
                      </span>
                    </span>
                    <span
                      className="numeric inline-flex h-[30px] shrink-0 items-center rounded-chip px-3 whitespace-nowrap"
                      style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)' }}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="t-caption mt-4" style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}>
                Retention is a floor set by the plan, not a ceiling you can lower below it.
                Shortening a window never deletes existing records retroactively.
              </p>
            </section>

            <section
              className="rounded-overlay p-5"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <p className="t-eyebrow mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Export
              </p>
              <p className="t-caption mb-4" style={{ color: 'var(--text-secondary)' }}>
                Platform-level records only. Customer message bodies are never exportable from this
                console.
              </p>
              <div className="flex flex-wrap gap-2.5">
                {model.exports.map((x) => (
                  <button
                    key={x}
                    type="button"
                    className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
                    style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', color: 'var(--text-primary)' }}
                  >
                    <IconDownload size={15} stroke={1.5} aria-hidden />
                    {x}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {tab === 'developer' ? (
          <>
            <section
              className="overflow-hidden rounded-overlay"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <div
                className="flex items-center justify-between gap-4 px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                  Platform API keys
                </p>
                <button
                  type="button"
                  className="t-compact h-[30px] rounded-panel px-3.5 whitespace-nowrap"
                  style={{ background: 'var(--blue-500)', color: '#ffffff', fontWeight: 500 }}
                >
                  Create key
                </button>
              </div>
              {model.apiKeys.map((k, i) => (
                <div
                  key={k.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                  style={{
                    borderBottom:
                      i === model.apiKeys.length - 1 ? undefined : '1px solid var(--border-subtle)',
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="t-compact block" style={{ color: 'var(--text-primary)' }}>
                      {k.label}
                    </span>
                    <span
                      className="mt-0.5 block"
                      style={{ font: '400 11.5px/1.4 var(--font-mono)', color: 'var(--text-tertiary)' }}
                    >
                      {k.masked}
                    </span>
                  </span>
                  <span
                    className="shrink-0 whitespace-nowrap"
                    style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                  >
                    {k.used}
                  </span>
                  <button
                    type="button"
                    className="t-caption h-7 shrink-0 rounded-panel px-2.5 whitespace-nowrap transition-colors"
                    style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', color: 'var(--danger-fg)' }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
              <div className="px-5 py-3.5" style={{ background: 'var(--surface-sunken)' }}>
                <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
                  A key&rsquo;s value is shown once, at creation. The console stores a hash and
                  cannot recover it — not for you, not for support.
                </p>
              </div>
            </section>

            <section
              className="rounded-overlay p-5"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <p className="t-eyebrow mb-4" style={{ color: 'var(--text-tertiary)' }}>
                Webhooks
              </p>
              <div className="grid gap-3">
                {model.webhooks.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-3.5 rounded-panel px-4 py-3.5"
                    style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}
                  >
                    <span
                      aria-hidden
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: w.healthy ? 'var(--success-fg)' : 'var(--warning-fg)' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block"
                        style={{
                          font: '400 var(--text-sm)/1.4 var(--font-mono)',
                          color: 'var(--text-primary)',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {w.url}
                      </span>
                      <span className="t-caption mt-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                        {w.events}
                      </span>
                    </span>
                    <span
                      className="shrink-0 whitespace-nowrap"
                      style={{
                        font: '400 12px/1 var(--font-mono)',
                        color: w.healthy ? 'var(--text-secondary)' : 'var(--warning-fg)',
                      }}
                    >
                      {w.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {/* ── Sticky save footer. One footer for every section, because
            switching tabs never resets the dirty bag. ────────────────────── */}
        <div
          className="surface-card sticky bottom-4 flex items-center gap-3 px-5 py-3.5"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <span
            className="t-compact flex-1"
            style={{
              color:
                saveState === 'saved'
                  ? 'var(--success-fg)'
                  : dirty
                    ? 'var(--warning-fg)'
                    : 'var(--text-tertiary)',
            }}
          >
            {saveState === 'saved' ? 'Settings saved.' : dirty ? 'Unsaved changes on this page' : 'No changes'}
          </span>
          <button
            type="button"
            onClick={discard}
            disabled={!dirty}
            className="t-compact h-8 rounded-panel px-3.5 whitespace-nowrap"
            style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', color: 'var(--text-primary)', opacity: dirty ? 1 : 0.5 }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="t-compact h-8 rounded-panel px-4 whitespace-nowrap"
            style={{
              border: 'none',
              background: saveState === 'saved' ? 'var(--success-fg)' : dirty ? 'var(--blue-500)' : 'var(--surface-inset)',
              color: saveState === 'saved' || dirty ? '#ffffff' : 'var(--text-disabled)',
              fontWeight: 500,
              cursor: dirty ? 'pointer' : 'not-allowed',
            }}
          >
            {saveState === 'saved' ? 'Saved' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The break-glass panel.
 *
 * ⚠ THE ONLY DESTRUCTIVE ACTION ON THIS SCREEN GETS A CONFIRMATION THE
 * DESIGN DID NOT DRAW. `Settings.dc.html` wires the button directly with no
 * dialog. Locking every platform admin out of every workspace — including the
 * owner, mid-support-session — is the highest-blast-radius action in the
 * console, one tier above suspend (C8) because it has no per-workspace scope
 * at all. It gets the same discipline: a dialog that states the consequence
 * before it lands, matching the pattern already set for suspend and the plan
 * blast radius. Reversible by a second admin is why it stops at a plain
 * confirm rather than suspend's type-to-confirm gate.
 */
function BreakGlassPanel({ initialActive }: { initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await toggleBreakGlass({ lock: !active });
      if (result.ok) {
        setActive((a) => !a);
        setConfirmOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section
      className="overflow-hidden rounded-overlay"
      style={{ border: `1px solid ${active ? 'var(--success-fg)' : 'var(--danger-fg)'}`, background: 'var(--surface-raised)', boxShadow: 'var(--glass-highlight), var(--shadow-sm)' }}
    >
      <div
        className="px-5 py-3.5"
        style={{
          background: active ? 'var(--success-bg)' : 'var(--danger-bg)',
          borderBottom: `1px solid ${active ? 'var(--success-fg)' : 'var(--danger-fg)'}`,
        }}
      >
        <p className="t-eyebrow" style={{ color: active ? 'var(--success-fg)' : 'var(--danger-fg)' }}>
          Break glass
        </p>
      </div>
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
        <span className="min-w-0 flex-1">
          <p className="t-compact" style={{ color: 'var(--text-primary)' }}>
            {active ? 'Support-session access is suspended platform-wide' : 'Suspend all support-session access'}
          </p>
          <p className="t-caption mt-1.5" style={{ color: 'var(--text-secondary)', maxWidth: '62ch', textWrap: 'pretty' }}>
            {active
              ? 'No admin, including you, can open a workspace until a second admin re-enables it.'
              : 'Blocks every platform admin from entering any workspace until a second admin re-enables it. Use during a suspected credential compromise. Customers are notified in their own activity log.'}
          </p>
        </span>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="t-compact h-[34px] shrink-0 rounded-panel px-4 whitespace-nowrap transition-colors"
          style={{
            border: `1px solid ${active ? 'var(--success-fg)' : 'var(--danger-fg)'}`,
            background: 'var(--surface-raised)',
            color: active ? 'var(--success-fg)' : 'var(--danger-fg)',
            fontWeight: 500,
          }}
        >
          {active ? 'Re-enable access' : 'Lock the platform'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!pending) {
            setConfirmOpen(next);
            if (!next) setError(null);
          }
        }}
        title={active ? 'Re-enable support-session access?' : 'Lock every admin out of every workspace?'}
        consequence={
          active
            ? 'Platform admins will be able to open support sessions again, subject to the usual reason and 30-minute cap.'
            : "This ends any open support session immediately and blocks new ones, for every admin, including you. It does not affect customer sign-ins."
        }
        confirmLabel={active ? 'Re-enable access' : 'Lock the platform'}
        tone={active ? 'primary' : 'destructive'}
        loading={pending}
        error={error}
        onConfirm={submit}
      />
    </section>
  );
}

/**
 * The theme picker.
 *
 * ⚠ THIS IS THE FIRST PLACE `system` IS ACTUALLY SELECTABLE IN THE PRODUCT.
 * `ThemeToggle` (the header control everywhere else) only cycles light and
 * dark, because a one-click toggle has no room for a third state. Writing
 * `system` to the cookie here means the SERVER resolves it correctly on the
 * next full render via the `Sec-CH-Prefers-Color-Scheme` client hint already
 * wired in `lib/theme.ts` — but that hint isn't available to a client-side
 * event handler, so `matchMedia` gives the immediate visual feedback the
 * click needs without waiting for a reload. Both paths agree because they
 * read the same OS signal by two different routes.
 */
function ThemeSection({ initialPreference }: { initialPreference: ThemePreference }) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);

  const applyResolved = useMemo(
    () => (pref: ThemePreference): ResolvedTheme => {
      if (pref === 'light' || pref === 'dark') return pref;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    [],
  );

  function pick(next: ThemePreference) {
    setPreference(next);
    const resolved = applyResolved(next);

    document.documentElement.classList.add('theme-switching');
    requestAnimationFrame(() => {
      document.documentElement.dataset.theme = resolved;
      document.documentElement.dataset.themePreference = next;
      document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=${THEME_COOKIE_MAX_AGE};samesite=lax`;
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-switching');
      });
    });
  }

  /* If 'system' is selected, follow the OS live rather than only at pick time
     — otherwise flipping the OS theme with this tab open would silently fall
     out of sync until the next reload. */
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const OPTIONS: Array<{ key: ThemePreference; label: string; icon: TablerIcon }> = [
    { key: 'light', label: 'Light', icon: IconSun },
    { key: 'dark', label: 'Dark', icon: IconMoon },
    { key: 'system', label: 'System', icon: IconDeviceDesktop },
  ];

  return (
    <section
      className="rounded-overlay p-5"
      style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)', boxShadow: 'var(--glass-highlight), var(--shadow-sm)' }}
    >
      <p className="t-eyebrow mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
        Appearance
      </p>
      <p className="t-caption mb-4" style={{ color: 'var(--text-secondary)' }}>
        Your own preference. It does not affect what customers see.
      </p>
      <div className="grid max-w-[480px] grid-cols-3 gap-2.5">
        {OPTIONS.map((opt) => {
          const on = preference === opt.key;
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => pick(opt.key)}
              aria-pressed={on}
              className="rounded-panel p-3 text-left transition-colors"
              style={{
                border: `1px solid ${on ? 'var(--blue-500)' : 'var(--border-subtle)'}`,
                background: on ? 'var(--blue-50)' : 'var(--surface-raised)',
                boxShadow: on ? 'var(--neu-raised)' : undefined,
              }}
            >
              <span
                className="grid h-10 place-items-center rounded-chip"
                style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}
                aria-hidden
              >
                <Icon size={18} stroke={1.5} style={{ color: on ? 'var(--blue-600)' : 'var(--text-tertiary)' }} />
              </span>
              <span
                className="mt-2.5 block"
                style={{ font: `${on ? 500 : 400} 12.5px/1 var(--font-ui)`, color: on ? 'var(--blue-600)' : 'var(--text-primary)' }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Toggle({
  on,
  locked,
  label,
  onToggle,
}: {
  on: boolean;
  locked?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <Switch.Root
      checked={on}
      disabled={locked}
      aria-label={label}
      title={locked ? 'Enforced by the platform. This cannot be changed.' : undefined}
      onCheckedChange={() => onToggle()}
      className="relative mt-0.5 h-5 w-[34px] shrink-0 rounded-full transition-colors"
      style={{
        border: 'none',
        background: locked ? 'var(--ink-400)' : on ? 'var(--blue-500)' : 'var(--surface-inset)',
        boxShadow: 'var(--neu-inset)',
        cursor: locked ? 'not-allowed' : 'pointer',
        transitionDuration: 'var(--duration-base)',
      }}
    >
      <Switch.Thumb
        className="absolute top-0.5 size-4 rounded-full transition-[left]"
        style={{
          left: on ? 16 : 2,
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)',
          transitionDuration: 'var(--duration-base)',
        }}
      />
    </Switch.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="block">
      <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      <span
        className="flex h-[38px] items-center rounded-chip px-3"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}
      >
        <span style={{ font: '400 var(--text-base)/1 var(--font-mono)', color: 'var(--text-primary)' }}>
          {value}
        </span>
      </span>
    </div>
  );
}
