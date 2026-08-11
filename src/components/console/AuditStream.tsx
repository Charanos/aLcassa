'use client';

import { useMemo, useState } from 'react';
import {
  IconBuildings,
  IconChevronDown,
  IconExternalLink,
  IconFileText,
  IconLayoutList,
  IconSearch,
  IconShieldLock,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import type { AuditEntry, AuditKind } from '@/lib/console/data';

/**
 * The audit stream. `Audit-Log.dc.html`.
 *
 * ⚠ ROWS EXPAND IN PLACE RATHER THAN OPENING A DRAWER.
 *
 * An audit entry is read in the context of the entries around it — an operator
 * is usually reconstructing a sequence, not inspecting one record. A drawer
 * covers exactly the neighbours that give the row meaning. Expanding in place
 * keeps the sequence visible and costs nothing but vertical space.
 *
 * ⚠ THE DIFF IS THE POINT, AND SO IS WHAT IT REFUSES TO SHOW.
 *
 * A redacted field renders as `redacted → redacted` in the disabled ink: the
 * reader learns that the value CHANGED without learning either value. That is
 * the whole promise — a credential rotation shows that the secret moved, never
 * the secret — and it holds because the real values are never selected into
 * the read model, not because this component hides them.
 *
 * Before is `--danger-fg` and after is `--success-fg`, which is the one place
 * in the console those two hues do not mean failure and success. They mean
 * removed and added, which is the convention every diff a developer has ever
 * read already uses, and fighting it would be a purity argument that costs
 * comprehension.
 */

const KIND_META: Record<AuditKind, { label: string; icon: TablerIcon; bg: string; ink: string }> = {
  tenant: { label: 'Workspace', icon: IconBuildings, bg: 'var(--blue-50)', ink: 'var(--blue-500)' },
  plan: { label: 'Plans', icon: IconLayoutList, bg: 'var(--surface-inset)', ink: 'var(--text-secondary)' },
  session: {
    label: 'Sessions',
    icon: IconExternalLink,
    bg: 'var(--orange-100)',
    ink: 'var(--accent-mark-text)',
  },
  rules: { label: 'AI rules', icon: IconFileText, bg: 'var(--surface-inset)', ink: 'var(--text-secondary)' },
  admin: { label: 'Admins', icon: IconShieldLock, bg: 'var(--danger-bg)', ink: 'var(--danger-fg)' },
};

const KINDS = Object.keys(KIND_META) as AuditKind[];

export function AuditStream({ entries }: { entries: AuditEntry[] }) {
  const [query, setQuery] = useState('');
  const [kinds, setKinds] = useState<AuditKind[]>([]);
  const [open, setOpen] = useState<string | null>(entries[1]?.id ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (kinds.length && !kinds.includes(e.kind)) return false;
      if (!q) return true;
      return `${e.action} ${e.target} ${e.actor}`.toLowerCase().includes(q);
    });
  }, [entries, query, kinds]);

  return (
    <>
      <div
        className="surface-card mt-5 flex flex-wrap items-center gap-2.5 p-3"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <label
          className="flex h-[34px] max-w-[340px] min-w-0 flex-1 basis-[260px] items-center gap-2.5 rounded-chip px-3"
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--neu-inset)',
          }}
        >
          <IconSearch
            size={16}
            stroke={1.5}
            className="shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Action, actor, or target"
            aria-label="Search the audit log"
            className="min-w-0 flex-1 border-none bg-transparent outline-none"
            style={{ font: '400 var(--text-sm)/1 var(--font-ui)', color: 'var(--text-primary)' }}
          />
        </label>

        {KINDS.map((k) => {
          const meta = KIND_META[k];
          const Icon = meta.icon;
          const on = kinds.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setKinds((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
              }
              className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap transition-colors"
              style={{
                border: `1px solid ${on ? 'var(--blue-500)' : 'var(--border-subtle)'}`,
                background: on ? 'var(--blue-50)' : 'var(--surface-raised)',
                color: on ? 'var(--blue-600)' : 'var(--text-secondary)',
                font: '400 var(--text-sm)/1 var(--font-ui)',
              }}
            >
              <Icon size={13} stroke={1.5} aria-hidden />
              {meta.label}
            </button>
          );
        })}

        <span className="t-compact ml-auto whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
          <span className="numeric" style={{ color: 'var(--text-primary)' }}>
            {filtered.length}
          </span>{' '}
          entries
        </span>
      </div>

      <div
        className="mt-4 overflow-hidden rounded-overlay"
        style={{
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-raised)',
          boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
        }}
      >
        {filtered.map((e) => {
          const meta = KIND_META[e.kind];
          const Icon = meta.icon;
          const isOpen = open === e.id;
          return (
            <div key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : e.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-sunken)]"
                style={{
                  minHeight: 44,
                  background: isOpen ? 'var(--surface-sunken)' : 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <span
                  className="grid size-[26px] shrink-0 place-items-center rounded-panel"
                  style={{ background: meta.bg, color: meta.ink }}
                  aria-hidden
                >
                  <Icon size={14} stroke={1.5} />
                </span>
                <span
                  className="hidden shrink-0 lg:block"
                  style={{
                    width: 128,
                    font: '400 11.5px/1 var(--font-mono)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {e.time}
                </span>
                <span
                  className="hidden shrink-0 truncate sm:block"
                  style={{
                    width: 210,
                    font: '400 var(--text-sm)/1 var(--font-mono)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {e.action}
                </span>
                <span
                  className="t-compact min-w-0 flex-1 truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {e.target}
                </span>
                <span className="hidden shrink-0 items-center gap-1.5 md:inline-flex">
                  <span
                    className="grid size-[22px] place-items-center rounded-full"
                    style={{
                      background: 'var(--surface-inset)',
                      color: 'var(--text-secondary)',
                      font: '500 10px/1 var(--font-mono)',
                    }}
                    aria-hidden
                  >
                    {e.initials}
                  </span>
                  <span
                    style={{
                      width: 62,
                      font: '400 12px/1 var(--font-mono)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {e.actor}
                  </span>
                </span>
                <IconChevronDown
                  size={15}
                  stroke={1.5}
                  className="shrink-0 transition-transform"
                  style={{
                    color: 'var(--text-tertiary)',
                    transform: isOpen ? 'rotate(180deg)' : undefined,
                    transitionDuration: 'var(--duration-fast)',
                  }}
                  aria-hidden
                />
              </button>

              {isOpen ? (
                <div
                  className="px-4 pt-4 pb-4 md:pl-14"
                  style={{
                    background: 'var(--surface-sunken)',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="mb-3.5 flex flex-wrap gap-x-7 gap-y-2">
                    <Fact label="Request" value={e.requestId} />
                    <Fact label="IP" value={e.ip} />
                    <Fact label="Workspace" value={e.tenantId} />
                    <Fact label="At" value={e.time} />
                  </div>

                  {e.diff?.length ? (
                    <div
                      className="overflow-hidden rounded-panel"
                      style={{
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--surface-raised)',
                      }}
                    >
                      <div
                        className="grid gap-0 px-3.5 py-2"
                        style={{
                          gridTemplateColumns: 'minmax(120px, 200px) 1fr 1fr',
                          background: 'var(--surface-inset)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        {['Field', 'Before', 'After'].map((h) => (
                          <span
                            key={h}
                            style={{
                              font: '500 10.5px/1 var(--font-mono)',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              color: 'var(--text-tertiary)',
                            }}
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                      {e.diff.map((d) => (
                        <div
                          key={d.field}
                          className="grid gap-0 px-3.5 py-2.5"
                          style={{
                            gridTemplateColumns: 'minmax(120px, 200px) 1fr 1fr',
                            borderBottom: '1px solid var(--border-subtle)',
                          }}
                        >
                          <span
                            className="truncate"
                            style={{
                              font: '400 12px/1.4 var(--font-mono)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {d.field}
                          </span>
                          <span
                            style={{
                              font: '400 12px/1.4 var(--font-mono)',
                              color: d.redacted ? 'var(--text-disabled)' : 'var(--danger-fg)',
                              fontStyle: d.redacted ? 'normal' : undefined,
                            }}
                          >
                            {d.before}
                          </span>
                          <span
                            style={{
                              font: '400 12px/1.4 var(--font-mono)',
                              color: d.redacted ? 'var(--text-disabled)' : 'var(--success-fg)',
                            }}
                          >
                            {d.after}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {e.reason ? (
                    /* The human sentence, marked with the accent rule. In an
                       append-only log of machine facts it is the only field
                       someone wrote on purpose, and it is what a dispute will
                       actually turn on. */
                    <p
                      className="t-compact mt-3 px-3.5 py-2.5"
                      style={{
                        borderLeft: '2px solid var(--accent-mark)',
                        background: 'var(--surface-raised)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {e.reason}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {filtered.length === 0 ? (
          <p
            className="t-compact px-4 py-10 text-center"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No entry matches those filters. The log is append-only, so nothing has been removed —
            only hidden by the current search.
          </p>
        ) : (
          <div
            className="flex items-center justify-center p-3.5"
            style={{ background: 'var(--surface-sunken)' }}
          >
            <button
              type="button"
              className="t-compact inline-flex h-8 items-center gap-2 rounded-panel px-3.5"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            >
              Load older entries
              <IconChevronDown size={14} stroke={1.5} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="t-caption" style={{ color: 'var(--text-secondary)' }}>
      {label}{' '}
      <span style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--text-primary)' }}>
        {value}
      </span>
    </span>
  );
}
