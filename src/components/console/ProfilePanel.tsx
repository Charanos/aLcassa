'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconCrown, IconKey, IconLock } from '@tabler/icons-react';
import type { ProfileModel } from '@/lib/console/data';
import { InertControl } from '@/components/console/Surface';
import {
  revokeConsoleSession,
  revokeOtherConsoleSessions,
  updateConsoleProfileName,
} from '@/app/(platform)/platform/(console)/profile-actions';

/**
 * ⚠ WHY THREE OF THE SECURITY CONTROLS ARE DISABLED RATHER THAN WIRED. 17 §6.4.
 *
 * Two-factor codes, the password and the recovery codes all live in Supabase's
 * `auth.users`, reachable only through the admin client — which is lint-guarded
 * to `modules/platform` because it bypasses Row Level Security. Widening that
 * guard so a console screen can redraw a checklist is a poor trade, and these
 * three are the security items on a security page: a control that silently did
 * nothing here is worse than one that says what it needs.
 */
const SECURITY_REASON: Record<string, string> = {
  mfa: 'Two-factor enrolment is managed by the identity provider, not from this console.',
  password: 'Password changes go through the recovery flow, which proves the address first.',
  recovery: 'Recovery codes are issued by the identity provider and shown only once.',
};

/**
 * The signed-in operator's own profile. `Profile.dc.html`.
 *
 * ⚠ THE RIGHT RAIL IS THE ACTUAL POINT OF THIS SCREEN, not the form.
 *
 * "What you cannot do" is the one panel with no equivalent anywhere else in
 * the console: read a customer's message bodies, see credential values, or
 * act inside a workspace. Every other screen states what an admin CAN reach;
 * this is the page that states the limit from the admin's own point of view,
 * which is the more persuasive direction for a security review — the person
 * with the most access on the platform is shown their own ceiling.
 */
export function ProfilePanel({ model }: { model: ProfileModel }) {
  const router = useRouter();
  const [name, setName] = useState(model.name);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = name.trim() !== model.name;

  /**
   * ⚠ THIS USED TO BE A `setTimeout` THAT SET "Saved." AND WROTE NOTHING.
   *
   * The failure mode is the worst available for a settings form: the operator
   * is told the change landed, navigates away, and finds the old value on
   * their next visit with no error to explain it. It now calls the server
   * action and reports what actually happened.
   */
  function save() {
    if (!dirty || pending) return;
    startTransition(async () => {
      const result = await updateConsoleProfileName(name);
      if (result.ok) {
        setSaveState('saved');
        setMessage(null);
        router.refresh();
        setTimeout(() => setSaveState('idle'), 2600);
      } else {
        setSaveState('error');
        setMessage(result.error);
      }
    });
  }

  function endSession(id: string) {
    if (pending) return;
    startTransition(async () => {
      const result = await revokeConsoleSession(id);
      if (result.ok) router.refresh();
      else setMessage(result.error);
    });
  }

  function endOtherSessions() {
    if (pending) return;
    startTransition(async () => {
      const result = await revokeOtherConsoleSessions();
      if (result.ok) router.refresh();
      else setMessage(result.error);
    });
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-5">
        {/* ── Identity ─────────────────────────────────────────────────── */}
        <section
          className="rounded-overlay p-5"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
          }}
        >
          <p className="t-eyebrow mb-5" style={{ color: 'var(--text-tertiary)' }}>
            Identity
          </p>

          <div
            className="flex items-center gap-4 pb-5"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <span
              className="grid size-14 shrink-0 place-items-center rounded-full"
              style={{
                background: 'var(--blue-50)',
                color: 'var(--blue-500)',
                font: '500 19px/1 var(--font-mono)',
              }}
              aria-hidden
            >
              {model.initials}
            </span>
            <p className="t-compact" style={{ color: 'var(--text-secondary)' }}>
              Initials are generated from your name. The console shows no photographs, so an avatar
              can never leak a face into a screenshot.
            </p>
          </div>

          <label className="mt-5 block">
            <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
              Full name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaveState('idle');
              }}
              className="t-body h-[38px] w-full rounded-chip px-3 outline-none"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--neu-inset)',
                color: 'var(--text-primary)',
              }}
            />
            <span className="t-caption mt-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
              Appears beside every action you take in customer audit logs.
            </span>
          </label>

          <div className="mt-4 block">
            <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
              Email
            </span>
            <span
              className="flex h-[38px] items-center gap-2.5 rounded-chip px-3"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-sunken)',
              }}
            >
              <span
                className="min-w-0 flex-1 truncate"
                style={{
                  font: '400 var(--text-base)/1 var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              >
                {model.email}
              </span>
              {model.emailVerified ? (
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
                  style={{ font: '400 11.5px/1 var(--font-mono)', color: 'var(--success-fg)' }}
                >
                  <IconCheck size={13} stroke={1.5} aria-hidden />
                  verified
                </span>
              ) : null}
            </span>
            <span className="t-caption mt-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
              Changing this requires another platform admin to approve the change.
            </span>
          </div>

          <div
            className="mt-5 flex items-center gap-3 border-t pt-5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span
              className="t-caption flex-1"
              style={{
                color:
                  saveState === 'error'
                    ? 'var(--danger-fg)'
                    : saveState === 'saved'
                      ? 'var(--success-fg)'
                      : dirty
                        ? 'var(--warning-fg)'
                        : 'var(--text-tertiary)',
              }}
            >
              {saveState === 'error'
                ? message
                : pending
                  ? 'Saving…'
                  : saveState === 'saved'
                    ? 'Saved.'
                    : dirty
                      ? 'Unsaved changes'
                      : 'No changes'}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending}
              className="t-compact h-[34px] rounded-panel px-4 whitespace-nowrap"
              style={{
                border: 'none',
                background:
                  saveState === 'saved'
                    ? 'var(--success-fg)'
                    : dirty
                      ? 'var(--blue-500)'
                      : 'var(--surface-inset)',
                color: saveState === 'saved' || dirty ? '#ffffff' : 'var(--text-disabled)',
                fontWeight: 500,
                cursor: dirty ? 'pointer' : 'not-allowed',
              }}
            >
              {saveState === 'saved' ? 'Saved' : 'Save changes'}
            </button>
          </div>
        </section>

        {/* ── Security ─────────────────────────────────────────────────── */}
        <section
          className="rounded-overlay p-5"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
          }}
        >
          <p className="t-eyebrow mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Security
          </p>
          <p className="t-caption mb-5" style={{ color: 'var(--text-secondary)' }}>
            You can see every workspace on the platform. These controls are the reason that is safe.
          </p>
          <div className="grid gap-3">
            {model.security.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-3.5 rounded-panel px-4 py-3.5"
                style={{
                  border: `1px solid ${s.state === 'good' ? 'var(--success-fg)' : 'var(--border-subtle)'}`,
                  background: s.state === 'good' ? 'var(--success-bg)' : 'var(--surface-raised)',
                }}
              >
                <span
                  className="grid size-[30px] shrink-0 place-items-center rounded-panel"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-raised)',
                    color: s.state === 'good' ? 'var(--success-fg)' : 'var(--text-secondary)',
                  }}
                  aria-hidden
                >
                  {s.key === 'mfa' ? (
                    <IconLock size={15} stroke={1.5} />
                  ) : (
                    <IconKey size={15} stroke={1.5} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-compact block" style={{ color: 'var(--text-primary)' }}>
                    {s.label}
                  </span>
                  <span
                    className="t-caption mt-0.5 block"
                    style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
                  >
                    {s.detail}
                  </span>
                </span>
                <InertControl
                  reason={SECURITY_REASON[s.key] ?? 'Managed by the identity provider.'}
                  className="t-caption h-[30px] shrink-0 rounded-panel px-3.5 whitespace-nowrap"
                >
                  {s.action}
                </InertControl>
              </div>
            ))}
          </div>
        </section>

        {/* ── Active sessions ──────────────────────────────────────────── */}
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
              Active sessions
            </p>
            {/* "Other devices", not "everywhere". A control that also signs
                YOU out is one nobody presses in the situation it exists for. */}
            <button
              type="button"
              onClick={endOtherSessions}
              disabled={pending || model.sessions.length < 2}
              className="t-caption h-7 shrink-0 rounded-panel px-2.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--danger-fg)',
                cursor: model.sessions.length < 2 ? 'not-allowed' : undefined,
                opacity: model.sessions.length < 2 ? 0.55 : undefined,
              }}
            >
              Sign out other devices
            </button>
          </div>
          {model.sessions.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-3.5 px-5 py-3.5"
              style={{
                borderBottom:
                  i === model.sessions.length - 1 ? undefined : '1px solid var(--border-subtle)',
              }}
            >
              <span
                aria-hidden
                className="size-[7px] shrink-0 rounded-full"
                style={{
                  background: s.current
                    ? 'var(--success-fg)'
                    : i === 1
                      ? 'var(--ink-400)'
                      : 'var(--ink-300)',
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="t-compact block" style={{ color: 'var(--text-primary)' }}>
                  {s.device}
                </span>
                <span
                  className="mt-0.5 block"
                  style={{ font: '400 11.5px/1.4 var(--font-mono)', color: 'var(--text-tertiary)' }}
                >
                  {s.meta}
                </span>
              </span>
              <span
                className="shrink-0 whitespace-nowrap"
                style={{
                  font: '400 12px/1 var(--font-ui)',
                  color: s.current ? 'var(--success-fg)' : 'var(--text-secondary)',
                }}
              >
                {s.when}
              </span>
              {/*
                The current device gets a label rather than a control. A row
                that can end the session you are reading it from is a row
                somebody ends by accident, and there is a deliberate way to
                sign out in the account menu.
              */}
              {s.current ? (
                <span
                  className="shrink-0 whitespace-nowrap"
                  style={{ font: '400 11.5px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                >
                  this device
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => endSession(s.id)}
                  disabled={pending}
                  className="t-caption h-7 shrink-0 rounded-panel px-2.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
                  style={{
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-raised)',
                    color: 'var(--danger-fg)',
                  }}
                >
                  End
                </button>
              )}
            </div>
          ))}
          {message ? (
            <p className="t-caption px-5 pb-3.5" style={{ color: 'var(--danger-fg)' }}>
              {message}
            </p>
          ) : null}
        </section>
      </div>

      {/* ── Rail ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4">
        <section
          className="rounded-overlay p-5"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
          }}
        >
          <p className="t-eyebrow mb-3.5" style={{ color: 'var(--text-tertiary)' }}>
            Your access
          </p>
          <span
            className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5"
            style={{
              background: 'var(--blue-50)',
              color: 'var(--blue-600)',
              font: '500 11.5px/1 var(--font-mono)',
            }}
          >
            <IconCrown size={13} stroke={1.5} aria-hidden />
            {model.role.replace('_', ' ')}
          </span>
          <div
            className="mt-4 grid gap-2.5 border-t pt-3.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {model.facts.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-3">
                <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                  {f.label}
                </span>
                <span className="numeric text-right" style={{ fontSize: 'var(--text-sm)' }}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-overlay p-5"
          style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}
        >
          <p className="t-eyebrow mb-3" style={{ color: 'var(--text-tertiary)' }}>
            What you cannot do
          </p>
          <p className="t-compact" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}>
            Read a customer&rsquo;s message bodies, see credential values, or act inside a
            workspace. A support session grants sight, never a master key.
          </p>
          <Link
            href="/platform/support-sessions"
            className="t-compact mt-3 inline-block"
            style={{ color: 'var(--text-action)' }}
          >
            Your session history
          </Link>
        </section>
      </div>
    </div>
  );
}
