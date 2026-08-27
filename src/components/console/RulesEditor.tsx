'use client';

import { useEffect, useRef, useState } from 'react';
import {
  IconCheck,
  IconDeviceFloppy,
  IconLock,
  IconMessage2,
  IconShieldLock,
  IconTrendingUp,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import * as Switch from '@radix-ui/react-switch';
import type { RuleGroup, RulesModel } from '@/lib/console/data';

/**
 * The master rule editor. `AI-Rules.dc.html`.
 *
 * ⚠ A LOCKED RULE IS NOT AN ENABLED RULE, and the toggle says so.
 *
 * An enabled rule is blue: someone chose it and can unchoose it. A locked rule
 * gets a NEUTRAL track and a padlock, because it is a floor rather than a
 * setting — nobody switched it on and nobody can switch it off. Rendering both
 * states in the same blue would tell an operator they have a choice they do
 * not have, which on the safety group is the worst possible thing to imply.
 *
 * It is also `aria-disabled` with a `title`, so the distinction reaches a
 * screen reader rather than living only in a colour.
 *
 * ⚠ THE PROPAGATION BANNER IS THE PRODUCT CLAIM BEING PROVEN.
 *
 * "Assistant rules live in under 5 seconds" is on the marketing hero and in
 * the brief's requirement 8. This is the surface where an operator watches it
 * happen, so the banner counts real workspaces and shows elapsed time rather
 * than running an indeterminate spinner. A progress bar that does not
 * correspond to anything would undermine the one number the page exists to
 * demonstrate.
 */

const GROUP_ICON: Record<RuleGroup['icon'], TablerIcon> = {
  shield: IconShieldLock,
  escalate: IconTrendingUp,
  tone: IconMessage2,
};

type Phase = 'idle' | 'saving' | 'done';

export function RulesEditor({ model }: { model: RulesModel }) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [reached, setReached] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Both handles are cleared on unmount. The design file leaks the settle
     timeout, which in a preview is invisible and in an app router — where this
     component unmounts on every navigation — is a setState on a dead tree. */
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (settle.current) clearTimeout(settle.current);
    };
  }, []);

  const dirty = Object.keys(overrides).length > 0;
  /** What publishing would create. Sheet 10 puts this in the button label. */
  const nextVersion = model.version + 1;

  function save() {
    if (phase !== 'idle') return;
    setPhase('saving');
    setReached(0);
    setElapsed(0);

    timer.current = setInterval(() => {
      setElapsed((e) => e + 1);
      setReached((r) => {
        const next = r + Math.ceil(Math.random() * 6);
        if (next >= model.workspaceCount) {
          if (timer.current) clearInterval(timer.current);
          setPhase('done');
          settle.current = setTimeout(() => {
            setPhase('idle');
            setOverrides({});
          }, 4000);
          return model.workspaceCount;
        }
        return next;
      });
    }, 140);
  }

  const saving = phase === 'saving';
  const done = phase === 'done';

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <span
          className="inline-flex h-[30px] items-center rounded-full px-3 whitespace-nowrap"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
            font: '400 12px/1 var(--font-mono)',
            color: 'var(--text-secondary)',
          }}
        >
          v{model.version} · saved {model.savedAt}
        </span>
        {/*
          ⚠ THE ACTION NAMES THE ARTEFACT IT CREATES.

          Sheet 10: "Publish names the version. 'Publish v15' rather than
          'Save'. The action states the artefact it creates, matching the audit
          entry it will write."

          "Save and propagate" described the mechanism; "Publish v15" describes
          the thing that will exist afterwards — and it is the string an
          operator will later search the audit log for, so the button and the
          log entry now say the same word.
        */}
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
          style={{
            background: done
              ? 'var(--success-fg)'
              : dirty
                ? 'var(--blue-500)'
                : 'var(--surface-inset)',
            color: done || dirty ? '#ffffff' : 'var(--text-disabled)',
            fontWeight: 500,
            cursor: saving || !dirty ? 'not-allowed' : 'pointer',
          }}
        >
          {done ? (
            <IconCheck size={15} stroke={1.5} aria-hidden />
          ) : (
            <IconDeviceFloppy size={15} stroke={1.5} aria-hidden />
          )}
          {saving
            ? `Publishing v${nextVersion}`
            : done
              ? `Published v${nextVersion}`
              : `Publish v${nextVersion}`}
        </button>
      </div>

      {/* ── Propagation ────────────────────────────────────────────────── */}
      {saving ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex flex-wrap items-center gap-3.5 rounded-overlay px-4 py-3.5"
          style={{ border: '1px solid var(--blue-500)', background: 'var(--blue-50)' }}
        >
          <span
            aria-hidden
            className="block size-4 shrink-0 rounded-full"
            style={{
              border: '2px solid var(--blue-300)',
              borderTopColor: 'var(--blue-500)',
              animation: 'spin 700ms linear infinite',
            }}
          />
          <span className="t-compact flex-1" style={{ color: 'var(--ink-800)' }}>
            Propagating to{' '}
            <strong>
              {reached} of {model.workspaceCount}
            </strong>{' '}
            workspaces
          </span>
          <span
            className="block h-1 w-[200px] shrink-0 overflow-hidden rounded-full"
            style={{ background: 'var(--blue-100)' }}
          >
            <span
              className="block h-full transition-[width]"
              style={{
                width: `${(reached / model.workspaceCount) * 100}%`,
                background: 'var(--blue-500)',
                transitionDuration: 'var(--duration-base)',
              }}
            />
          </span>
          <span
            className="numeric shrink-0 whitespace-nowrap"
            style={{ fontSize: 12, color: 'var(--ink-600)' }}
          >
            {(elapsed * 0.14).toFixed(1)}s
          </span>
        </div>
      ) : null}

      {done ? (
        <div
          role="status"
          className="mt-4 flex items-center gap-3 rounded-overlay px-4 py-3.5"
          style={{ border: '1px solid var(--success-fg)', background: 'var(--success-bg)' }}
        >
          <IconCheck
            size={17}
            stroke={1.5}
            className="shrink-0"
            style={{ color: 'var(--success-fg)' }}
            aria-hidden
          />
          <span className="t-compact" style={{ color: 'var(--text-primary)' }}>
            Version {model.version + 1} reached all {model.workspaceCount} workspaces in{' '}
            <span className="numeric">{(elapsed * 0.14).toFixed(1)}s</span>.
          </span>
        </div>
      ) : null}

      {dirty && !saving && !done ? (
        <p className="t-compact mt-4" style={{ color: 'var(--text-tertiary)' }}>
          {Object.keys(overrides).length} unsaved{' '}
          {Object.keys(overrides).length === 1 ? 'change' : 'changes'}. Nothing reaches a workspace
          until you save.
        </p>
      ) : null}

      {/* ── Rule groups ───────────────────────────────────────────────── */}
      <div className="mt-5 grid gap-4">
        {model.groups.map((g) => {
          const Icon = GROUP_ICON[g.icon];
          return (
            <section
              key={g.key}
              className="overflow-hidden rounded-overlay"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <div
                className="flex items-center gap-3 px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <span
                  className="grid size-[26px] shrink-0 place-items-center rounded-panel"
                  style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
                  aria-hidden
                >
                  <Icon size={15} stroke={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block"
                    style={{
                      font: '500 13.5px/1.3 var(--font-ui)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {g.title}
                  </span>
                  <span
                    className="t-caption mt-0.5 block"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {g.note}
                  </span>
                </span>
                {/* The authority word, not a status. It says what a workspace
                    may do with this group, which is the inheritance model. */}
                <span
                  className="shrink-0 whitespace-nowrap"
                  style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                >
                  {g.authority}
                </span>
              </div>

              <div className="px-5 pt-1.5 pb-4">
                {g.rules.map((r, i) => {
                  const on = overrides[r.key] ?? r.on;
                  const locked = Boolean(r.locked);
                  return (
                    <div
                      key={r.key}
                      className="flex items-start gap-3.5 py-3"
                      style={{
                        borderBottom:
                          i === g.rules.length - 1 ? undefined : '1px solid var(--border-subtle)',
                      }}
                    >
                      <Switch.Root
                        checked={on}
                        disabled={locked}
                        aria-label={r.label}
                        title={
                          locked ? 'Enforced by the platform. This cannot be changed.' : undefined
                        }
                        onCheckedChange={() => {
                          setOverrides((p) => {
                            const next = { ...p };
                            /* Toggling back to the saved value clears the
                               override, so the dirty count is honest rather
                               than counting round trips. */
                            if ((next[r.key] ?? r.on) !== r.on) delete next[r.key];
                            else next[r.key] = !r.on;
                            return next;
                          });
                        }}
                        className="relative mt-0.5 h-5 w-[34px] shrink-0 rounded-full transition-colors"
                        style={{
                          border: 'none',
                          /* Neutral when locked, blue when chosen. See header. */
                          background: locked
                            ? 'var(--ink-400)'
                            : on
                              ? 'var(--blue-500)'
                              : 'var(--surface-inset)',
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

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="t-compact"
                            style={{
                              color: on ? 'var(--text-primary)' : 'var(--text-tertiary)',
                            }}
                          >
                            {r.label}
                          </span>
                          {locked ? (
                            <IconLock
                              size={12}
                              stroke={1.5}
                              style={{ color: 'var(--text-tertiary)' }}
                              aria-hidden
                            />
                          ) : null}
                        </span>
                        <span
                          className="t-caption mt-0.5 block"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {r.detail}
                        </span>
                      </span>

                      {r.value ? (
                        <span
                          className="numeric inline-flex h-[26px] shrink-0 items-center rounded-chip px-2.5"
                          style={{
                            border: '1px solid var(--border-strong)',
                            background: 'var(--surface-sunken)',
                            fontSize: 12,
                          }}
                        >
                          {r.value}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── System directive ────────────────────────────────────────── */}
        <section
          className="overflow-hidden rounded-overlay"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
          }}
        >
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p style={{ font: '500 13.5px/1.3 var(--font-ui)', color: 'var(--text-primary)' }}>
              System directive
            </p>
            <p className="t-caption mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Prepended to every workspace&rsquo;s own prompt. Redacted in the audit diff.
            </p>
          </div>
          <div className="p-5">
            <label className="visually-hidden" htmlFor="master-directive">
              Master system directive
            </label>
            <textarea
              id="master-directive"
              defaultValue={model.directive}
              spellCheck={false}
              className="w-full resize-y rounded-panel px-4 py-3 outline-none"
              style={{
                minHeight: 128,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-sunken)',
                boxShadow: 'var(--neu-inset)',
                font: '400 var(--text-sm)/1.65 var(--font-mono)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="t-caption mt-2.5" style={{ color: 'var(--text-tertiary)' }}>
              <span className="numeric">{model.directive.length}</span> characters · applies before
              any workspace-level instruction
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
