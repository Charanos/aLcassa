'use client';

import { useState, useTransition } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconBell,
  IconCode,
  IconDatabase,
  IconDownload,
  IconShieldLock,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import type { SettingsModel } from '@/lib/console/data';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { toggleBreakGlass } from '@/app/(platform)/platform/(console)/actions';
import { useToast } from '@/components/primitives/Toast';
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

export function SettingsPanel({
  model,
  initialTab,
  lockedBy,
  lockedAt,
  lockedReason,
}: {
  model: SettingsModel;
  initialTab: TabKey;
  /* The lock is an audit EVENT now, so who/when/why travel with the state.
     See `modules/platform/internal/breakGlass.ts`. */
  lockedBy?: string | null;
  lockedAt?: string | null;
  lockedReason?: string | null;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [platformName, setPlatformName] = useState(model.platformName);
  const [supportEmail, setSupportEmail] = useState(model.supportEmail);
  const [policyOverrides, setPolicyOverrides] = useState<Record<string, boolean>>({});
  const [notifyOverrides, setNotifyOverrides] = useState<
    Record<string, { console: boolean; email: boolean }>
  >({});

  const dirty =
    platformName !== model.platformName ||
    supportEmail !== model.supportEmail ||
    Object.keys(policyOverrides).length > 0 ||
    Object.keys(notifyOverrides).length > 0;

  /**
   * ⚠ THERE IS NOTHING TO SAVE INTO, AND THE SCREEN NOW SAYS SO. 17 §6.4.
   *
   * This function used to set 'saved', show a green footer, and write nothing.
   * That is the worst failure available to a settings form — worse than a dead
   * button, because the operator is told the change landed and finds the old
   * value on their next visit with no error to explain it. On a page whose own
   * lede warns that a typo here reaches every workspace's customers, a false
   * confirmation is not a cosmetic bug.
   *
   * The schema has `tenant_settings` and no platform-level equivalent, so
   * persisting these needs a migration, which this pass deliberately does not
   * run. Until it lands the controls stay editable — an operator can still see
   * what the form would do — and the footer states plainly that nothing is
   * written. The edits are local and disappear on reload, which is what
   * 'Discard' already did honestly.
   */
  const PERSISTENCE_NOTE =
    'Not yet saved anywhere. Platform settings have no store until the settings table lands.';

  function discard() {
    setPlatformName(model.platformName);
    setSupportEmail(model.supportEmail);
    setPolicyOverrides({});
    setNotifyOverrides({});
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

            <BreakGlassPanel
              initialActive={model.breakGlassActive}
              lockedBy={lockedBy}
              lockedAt={lockedAt}
              lockedReason={lockedReason}
            />
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
                    style={{
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--surface-sunken)',
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="t-compact block" style={{ color: 'var(--text-primary)' }}>
                        {r.label}
                      </span>
                      <span
                        className="t-caption mt-0.5 block"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {r.detail}
                      </span>
                    </span>
                    <span
                      className="numeric inline-flex h-[30px] shrink-0 items-center rounded-chip px-3 whitespace-nowrap"
                      style={{
                        border: '1px solid var(--border-strong)',
                        background: 'var(--surface-raised)',
                      }}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
              <p
                className="t-caption mt-4"
                style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
              >
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
                {/* Links rather than buttons: the route answers with
                    Content-Disposition and the browser does the rest. Same
                    handler as the Export control on Workspaces, Revenue and
                    the audit log — one route, one closed catalogue. 17 §6.1. */}
                {model.exports.map((x) => (
                  <a
                    key={x.resource}
                    href={`/api/platform/export/${x.resource}`}
                    className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
                    style={{
                      border: '1px solid var(--border-strong)',
                      background: 'var(--surface-raised)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <IconDownload size={15} stroke={1.5} aria-hidden />
                    {x.label}
                  </a>
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
                  disabled
                  title="Platform-level API keys are not a table. Credentials are scoped to a workspace."
                  className="t-compact h-[30px] rounded-panel px-3.5 whitespace-nowrap"
                  style={{
                    opacity: 0.45,
                    cursor: 'not-allowed',
                    background: 'var(--blue-500)',
                    color: 'var(--text-inverse)',
                    fontWeight: 500,
                  }}
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
                      style={{
                        font: '400 11.5px/1.4 var(--font-mono)',
                        color: 'var(--text-tertiary)',
                      }}
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
                    disabled
                    title="Platform-level API keys are not a table. Credentials are scoped to a workspace."
                    className="t-caption h-7 shrink-0 rounded-panel px-2.5 whitespace-nowrap transition-colors"
                    style={{
                      opacity: 0.45,
                      cursor: 'not-allowed',
                      border: '1px solid var(--border-strong)',
                      background: 'var(--surface-raised)',
                      color: 'var(--danger-fg)',
                    }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
              {/*
                ⚠ THE STRIP CARRIES BOTH FACTS NOW.

                "Create key" and "Revoke" were dead with their reason in a
                `title` only, which 17 §6.4 does not accept — and this strip was
                already sitting underneath them saying something adjacent. Two
                sentences in the place a reader is already looking beats a
                repeated chip beside each of the four rows.
              */}
              <div className="px-5 py-3.5" style={{ background: 'var(--surface-sunken)' }}>
                <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
                  A key&rsquo;s value is shown once, at creation. The console stores a hash and
                  cannot recover it — not for you, not for support.
                </p>
                <p className="t-compact mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  Issuing and revoking are held here because a credential belongs to the
                  workspace that uses it: these are read-only copies of what each one holds, and
                  the controls that change them sit on the workspace, where the change is
                  recorded against the customer who owns it.
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
                    style={{
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--surface-sunken)',
                    }}
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
                      <span
                        className="t-caption mt-0.5 block"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
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
              color: dirty ? 'var(--warning-fg)' : 'var(--text-tertiary)',
            }}
          >
            {dirty ? PERSISTENCE_NOTE : 'No changes'}
          </span>
          <button
            type="button"
            onClick={discard}
            disabled={!dirty}
            className="t-compact h-8 rounded-panel px-3.5 whitespace-nowrap"
            style={{
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
              opacity: dirty ? 1 : 0.5,
            }}
          >
            Discard
          </button>
          <button
            type="button"
            disabled
            title={PERSISTENCE_NOTE}
            className="t-compact h-8 rounded-panel px-4 whitespace-nowrap"
            style={{
              border: 'none',
              background: 'var(--surface-inset)',
              color: 'var(--text-disabled)',
              fontWeight: 500,
              cursor: 'not-allowed',
            }}
          >
            Save settings
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
function BreakGlassPanel({
  initialActive,
  lockedBy,
  lockedAt,
  lockedReason,
}: {
  initialActive: boolean;
  lockedBy?: string | null;
  lockedAt?: string | null;
  lockedReason?: string | null;
}) {
  const pushToast = useToast();
  const [active, setActive] = useState(initialActive);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await toggleBreakGlass({ lock: !active, reason });
      if (result.ok) {
        setActive(result.locked);
        setConfirmOpen(false);
        setReason('');
        /*
          ⚠ THE TOAST REPORTS THE SIDE EFFECT, WHICH IS THE POINT OF THE
          CONTROL. Engaging the lock revokes every open support session — a
          colleague may have been inside a workspace a second ago — and a
          confirmation that says only "locked" hides the thing the operator
          most needs to know they just did.
        */
        pushToast({
          tone: result.locked ? 'attention' : 'success',
          title: result.locked
            ? 'Support access locked platform-wide'
            : 'Support access re-enabled',
          description: result.locked
            ? result.revoked > 0
              ? `${result.revoked} open ${result.revoked === 1 ? 'session was' : 'sessions were'} ended immediately.`
              : 'No sessions were open. New ones are refused until this is released.'
            : 'Support sessions can be opened again, with the usual reason and 30-minute cap.',
        });
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section
      className="overflow-hidden rounded-overlay"
      style={{
        border: `1px solid ${active ? 'var(--success-fg)' : 'var(--danger-fg)'}`,
        background: 'var(--surface-raised)',
        boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
      }}
    >
      <div
        className="px-5 py-3.5"
        style={{
          background: active ? 'var(--success-bg)' : 'var(--danger-bg)',
          borderBottom: `1px solid ${active ? 'var(--success-fg)' : 'var(--danger-fg)'}`,
        }}
      >
        <p
          className="t-eyebrow"
          style={{ color: active ? 'var(--success-fg)' : 'var(--danger-fg)' }}
        >
          Break glass
        </p>
      </div>
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
        <span className="min-w-0 flex-1">
          <p className="t-compact" style={{ color: 'var(--text-primary)' }}>
            {active
              ? 'Support-session access is suspended platform-wide'
              : 'Suspend all support-session access'}
          </p>
          <p
            className="t-caption mt-1.5"
            style={{ color: 'var(--text-secondary)', maxWidth: '62ch', textWrap: 'pretty' }}
          >
            {active
              ? 'No admin, including you, can open a workspace until this is released.'
              : 'Blocks every platform admin from entering any workspace, and ends any session already open. Use during a suspected credential compromise. Customers see it in their own activity log.'}
          </p>
          {/*
            ⚠ WHO, WHEN AND WHY — WHICH THE OLD PANEL COULD NOT SHOW.

            It rendered a boolean and nothing else, because a boolean was all
            it had. The lock is now the latest audit event rather than a flag,
            so the record and the state are the same row and this comes for
            free: an operator arriving at a locked platform can see whose
            decision it was and what it was about, rather than having to go and
            search the log to find out whether it is safe to release.
          */}
          {active && lockedAt ? (
            <p
              className="t-caption mt-2 rounded-panel px-3 py-2"
              style={{
                background: 'var(--surface-sunken)',
                color: 'var(--text-tertiary)',
                maxWidth: '62ch',
                textWrap: 'pretty',
              }}
            >
              Locked by {lockedBy ?? 'a platform admin'} · {lockedAt}
              {lockedReason ? (
                <>
                  <br />
                  <span style={{ color: 'var(--text-secondary)' }}>&ldquo;{lockedReason}&rdquo;</span>
                </>
              ) : null}
            </p>
          ) : null}
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
        title={
          active ? 'Re-enable support-session access?' : 'Lock every admin out of every workspace?'
        }
        consequence={
          active
            ? 'Platform admins will be able to open support sessions again, subject to the usual reason and 30-minute cap.'
            : 'This ends any open support session immediately and blocks new ones, for every admin, including you. It does not affect customer sign-ins.'
        }
        details={
          <div className="grid gap-1.5 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
            {/*
              ⚠ REQUIRED IN BOTH DIRECTIONS, AND THE RELEASE IS THE ONE PEOPLE
              SKIP. "We locked support at 14:02" with no matching account of
              why it was safe to reopen at 15:40 is half a record, and the
              missing half is the half a security review asks about.
            */}
            <label
              htmlFor="break-glass-reason"
              className="t-label"
              style={{ color: 'var(--text-secondary)' }}
            >
              {active ? 'Why it is safe to reopen' : 'What happened'} &middot; goes in the platform
              log
            </label>
            <textarea
              id="break-glass-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={
                active
                  ? 'Credential rotated and the compromised session confirmed closed.'
                  : 'Possible credential compromise on the support account; rotating now.'
              }
              className="rounded-panel border px-3 py-2"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
                font: '400 var(--text-sm)/1.5 var(--font-ui)',
              }}
            />
          </div>
        }
        confirmLabel={active ? 'Re-enable access' : 'Lock the platform'}
        tone={active ? 'primary' : 'destructive'}
        loading={pending}
        error={error}
        onConfirm={() => {
          /* The server enforces the minimum too; this keeps the button honest
             about whether pressing it can succeed. */
          if (reason.trim().length >= 8) submit();
          else setError(active ? "Say why it is safe to reopen." : "Say what happened.");
        }}
      />
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
          background: 'var(--surface-raised)',
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
        <span
          style={{ font: '400 var(--text-base)/1 var(--font-mono)', color: 'var(--text-primary)' }}
        >
          {value}
        </span>
      </span>
    </div>
  );
}
