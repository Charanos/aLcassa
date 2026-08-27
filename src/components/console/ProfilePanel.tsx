'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconCheck, IconCrown, IconKey, IconLock } from '@tabler/icons-react';
import type { ProfileModel } from '@/lib/console/data';

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
  const [name, setName] = useState(model.name);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const dirty = name !== model.name;

  function save() {
    if (!dirty) return;
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2600);
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
                  saveState === 'saved'
                    ? 'var(--success-fg)'
                    : dirty
                      ? 'var(--warning-fg)'
                      : 'var(--text-tertiary)',
              }}
            >
              {saveState === 'saved' ? 'Saved.' : dirty ? 'Unsaved changes' : 'No changes'}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
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
                <button
                  type="button"
                  className="t-caption h-[30px] shrink-0 rounded-panel px-3.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
                  style={{
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-raised)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {s.action}
                </button>
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
            <button
              type="button"
              className="t-caption h-7 shrink-0 rounded-panel px-2.5 whitespace-nowrap transition-colors"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--danger-fg)',
              }}
            >
              Sign out everywhere
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
            </div>
          ))}
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
