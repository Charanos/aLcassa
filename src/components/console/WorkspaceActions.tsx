'use client';

import { useEffect, useState } from 'react';
import { IconCircleX, IconExternalLink } from '@tabler/icons-react';
import { StartSessionDialog } from './StartSessionDialog';
import type { ConsoleWorkspace } from './types';

/**
 * The two destructive controls on a workspace: open a support session, and
 * suspend.
 *
 * ⚠ THE SUSPEND DIALOG STATES ITS CONSEQUENCES IN PEOPLE.
 *
 * This is the best idea in the whole design set and it is worth naming. The
 * default confirm dialog asks "are you sure?", which is a question about the
 * operator's confidence and tells them nothing they did not already know. This
 * one answers a different question — what will happen — in three counts:
 *
 *     247   staff lose access at their next request
 *   1,284   open conversations stop receiving replies
 *       4   channels go quiet, including the WhatsApp number
 *
 * An operator who reads that and proceeds has genuinely decided. An operator
 * who reads "are you sure?" has only clicked. The counts come from the read
 * model rather than the component, so they cannot drift into being wrong.
 *
 * Type-to-confirm on the slug is the second gate. It exists because suspend
 * sits next to "Support session" in the header, and the cost of a misclick is
 * measured in the numbers above.
 */
export function WorkspaceActions({
  workspace,
  impact,
  onStartSession,
}: {
  workspace: ConsoleWorkspace;
  impact: { staff: number; conversations: number; channels: number };
  onStartSession: (input: {
    tenantId: string;
    tenantName: string;
    reason: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [sessionOpen, setSessionOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [confirm, setConfirm] = useState('');

  const armed = confirm.trim() === workspace.slug;

  useEffect(() => {
    if (!suspendOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSuspendOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [suspendOpen]);

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setSessionOpen(true)}
          className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
          }}
        >
          <IconExternalLink size={15} stroke={1.5} aria-hidden />
          Support session
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirm('');
            setSuspendOpen(true);
          }}
          className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            color: 'var(--danger-fg)',
          }}
        >
          <IconCircleX size={15} stroke={1.5} aria-hidden />
          Suspend
        </button>
      </div>

      {sessionOpen ? (
        <StartSessionDialog
          workspace={workspace}
          onCancel={() => setSessionOpen(false)}
          onConfirm={async (reason) => {
            const result = await onStartSession({
              tenantId: workspace.id,
              tenantName: workspace.name,
              reason,
            });
            if (result.ok) setSessionOpen(false);
            return result;
          }}
        />
      ) : null}

      {suspendOpen ? (
        <div
          onClick={() => setSuspendOpen(false)}
          className="fixed inset-0 grid place-items-center p-6"
          style={{
            zIndex: 90,
            background: 'var(--surface-overlay)',
            animation: 'overlay-in var(--duration-fast) linear',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="suspend-title"
            onClick={(e) => e.stopPropagation()}
            className="surface-glass-strong w-[580px] max-w-full overflow-hidden rounded-overlay"
            style={{ animation: 'panel-in var(--duration-base) var(--ease-out)' }}
          >
            <div className="p-6">
              <p className="t-eyebrow" style={{ color: 'var(--danger-fg)' }}>
                Destructive
              </p>
              <h2
                id="suspend-title"
                className="display display-md mt-2.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Suspend {workspace.name}
              </h2>
              <p
                className="t-body mt-3"
                style={{ color: 'var(--text-secondary)', maxWidth: '58ch' }}
              >
                Stated in numbers, because a suspension is felt by people who did not choose it:
              </p>

              <ul
                className="mt-4 grid list-none gap-2.5 border-t p-0 pt-4"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <Impact n={impact.staff}>
                  staff lose access at their next request. Sessions are not waited out.
                </Impact>
                <Impact n={impact.conversations}>
                  open conversations stop receiving replies. Inbound messages queue but nothing
                  sends.
                </Impact>
                <Impact n={impact.channels}>
                  connected channels go quiet, including the WhatsApp number their customers reply
                  to.
                </Impact>
              </ul>

              <p className="t-compact mt-4" style={{ color: 'var(--text-secondary)' }}>
                Data is retained. Reactivation restores access immediately and is a single action.
              </p>

              <label className="mt-5 block">
                <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
                  Type{' '}
                  <span
                    style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--danger-fg)' }}
                  >
                    {workspace.slug}
                  </span>{' '}
                  to confirm
                </span>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={workspace.slug}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-chip px-3"
                  style={{
                    height: 38,
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-raised)',
                    font: '400 var(--text-base)/1 var(--font-mono)',
                    color: 'var(--text-primary)',
                  }}
                />
              </label>
            </div>

            <div
              className="flex items-center gap-2.5 border-t px-6 py-3.5"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
            >
              <span className="t-caption numeric flex-1" style={{ color: 'var(--text-tertiary)' }}>
                tenant.suspend
              </span>
              <button
                type="button"
                onClick={() => setSuspendOpen(false)}
                className="t-compact rounded-panel px-3.5"
                style={{
                  height: 36,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!armed}
                className="t-compact rounded-panel px-4"
                style={{
                  height: 36,
                  border: 'none',
                  fontWeight: 500,
                  background: armed ? 'var(--red-500)' : 'var(--surface-inset)',
                  color: armed ? '#ffffff' : 'var(--text-disabled)',
                  cursor: armed ? 'pointer' : 'not-allowed',
                }}
              >
                Suspend workspace
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Impact({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="t-compact flex items-start gap-3" style={{ color: 'var(--text-primary)' }}>
      <span
        className="numeric shrink-0 text-right"
        style={{ color: 'var(--danger-fg)', minWidth: '5ch' }}
      >
        {n.toLocaleString('en-GB')}
      </span>
      <span>{children}</span>
    </li>
  );
}
