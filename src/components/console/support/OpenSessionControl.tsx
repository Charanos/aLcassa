'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconDoorEnter, IconSearch } from '@tabler/icons-react';
import { ConsoleDialog } from '@/components/primitives/ConsoleDialog';
import { useToast } from '@/components/primitives/Toast';
import { StartSessionDialog } from '../StartSessionDialog';
import { startSupportSession } from '@/app/(platform)/platform/(console)/actions';
import type { ConsoleWorkspace } from '../types';
import type { SupportRegister } from '@/lib/console/liveSupport';

/**
 * "Open a session", from the register itself. Doc 24 · Stage 5.
 *
 * Entering used to be reachable only from the workspace switcher and the
 * workspace pages — never from the page about entering. Pick a workspace,
 * then the same dialog every other entry point uses, with its reference and
 * its reason. On success the operator lands inside.
 */
export function OpenSessionControl({
  directory,
  disabled,
  disabledReason,
}: {
  directory: SupportRegister['directory'];
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const pushToast = useToast();
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<ConsoleWorkspace | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.slug.includes(q))
      .slice(0, 12);
  }, [directory, query]);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setPicking(true)}
        aria-describedby={disabled ? 'open-session-reason' : undefined}
        className="t-compact inline-flex h-9 items-center gap-2 rounded-full px-4 whitespace-nowrap"
        style={{
          background: disabled ? 'var(--surface-sunken)' : 'var(--blue-500)',
          color: disabled ? 'var(--text-disabled)' : 'var(--text-inverse)',
          border: disabled ? '1px solid var(--border-subtle)' : 'none',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <IconDoorEnter size={15} stroke={1.5} aria-hidden />
        Open a session
      </button>
      {disabled && disabledReason ? (
        <p
          id="open-session-reason"
          className="t-caption max-w-[34ch] sm:text-right"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {disabledReason}
        </p>
      ) : null}

      <ConsoleDialog
        open={picking}
        onOpenChange={setPicking}
        eyebrow="Support session"
        title="Which workspace?"
        description="You will write the reason next. The customer reads it."
        actions={
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="t-compact h-9 rounded-panel px-3.5"
            style={{
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
            }}
          >
            Cancel
          </button>
        }
      >
        <label
          className="flex h-10 items-center gap-2 rounded-chip px-3"
          style={{ border: '1px solid var(--border-strong)' }}
        >
          <IconSearch
            size={15}
            stroke={1.5}
            aria-hidden
            style={{ color: 'var(--text-tertiary)' }}
          />
          <span className="sr-only">Search workspaces</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or slug"
            className="t-body min-w-0 flex-1 bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </label>
        <ul className="m-0 mt-3 grid max-h-80 list-none gap-1 overflow-y-auto p-0">
          {matches.length === 0 ? (
            <li className="t-compact px-3 py-4" style={{ color: 'var(--text-tertiary)' }}>
              No workspace matches.
            </li>
          ) : (
            matches.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicking(false);
                    setChosen({
                      id: d.id,
                      name: d.name,
                      slug: d.slug,
                      plan: d.plan,
                      initials: d.name.slice(0, 2).toUpperCase(),
                    });
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-panel px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-inset)]"
                >
                  <span className="t-compact" style={{ color: 'var(--text-primary)' }}>
                    {d.name}
                  </span>
                  <span
                    className="font-mono text-2xs"
                    style={{
                      color: d.status === 'active' ? 'var(--text-tertiary)' : 'var(--warning-fg)',
                    }}
                  >
                    {d.status === 'active' ? d.slug : `${d.slug} · ${d.status}`}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </ConsoleDialog>

      {chosen ? (
        <StartSessionDialog
          workspace={chosen}
          onCancel={() => setChosen(null)}
          onConfirm={async (reason) => {
            const result = await startSupportSession({
              tenantId: chosen.id,
              tenantName: chosen.name,
              reason,
            });
            if (result.ok) {
              setChosen(null);
              pushToast({
                tone: 'success',
                title: `You are inside ${chosen.name}`,
                description: 'Thirty minutes, in their activity log, and the owner is emailed.',
              });
              router.push('/platform/inside');
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
