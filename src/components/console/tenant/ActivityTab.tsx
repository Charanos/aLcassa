'use client';

import { useState } from 'react';
import { IconCalendar, IconHistory, IconUsers } from '@tabler/icons-react';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { Panel, SectionHeading } from '@/components/console/Surface';
import { describeEntry } from '@/lib/console/auditVocabulary';
import type { AuditEntry } from '@/lib/console/data';

export function ActivityTab({ activity }: { activity: AuditEntry[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const filtered = activity.filter((entry) =>
    `${describeEntry(entry).label} ${entry.actor} ${entry.target}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const current = Math.min(page, pages - 1);
  return (
    <div>
      <FactStrip label="Workspace platform activity summary">
        <FactCell
          icon={IconHistory}
          label="Recorded events"
          value={activity.length.toLocaleString('en-KE')}
          note={
            activity.length >= 2000
              ? 'Latest 2,000 events; read limit reached'
              : 'Platform events targeting this workspace'
          }
        />
        <FactCell
          icon={IconUsers}
          label="Operators"
          value={new Set(activity.map((entry) => entry.actor)).size}
          note="Named in the visible event window"
        />
        <FactCell
          icon={IconCalendar}
          label="Activity window"
          value="30 days"
          note="Times shown in Nairobi time"
        />
      </FactStrip>
      <SectionHeading
        title="Platform activity"
        note="Operator actions for this workspace. Customer-only activity remains inside the workspace."
        align="right"
      />
      <Panel title="Event history">
        <label className="mb-5 grid max-w-md gap-2">
          <span className="t-compact text-[var(--text-secondary)]">
            Search actions or operators
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            className="field-sunken t-body min-h-11 rounded-overlay border border-[var(--border-subtle)] px-3"
          />
        </label>
        {filtered.length === 0 ? (
          <div className="rounded-overlay bg-[var(--surface-raised)] p-6">
            <p className="t-body font-medium">
              {search ? 'No matching events.' : 'No platform events in this window.'}
            </p>
            <p className="t-compact mt-2 text-[var(--text-secondary)]">
              {search
                ? 'Try another action or operator name.'
                : 'Recorded operator actions will appear here.'}
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-[var(--border-subtle)] rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
            {filtered.slice(current * 25, current * 25 + 25).map((entry) => (
              <li key={entry.id} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="t-body font-medium">{describeEntry(entry).label}</p>
                  <p className="t-compact mt-1 text-[var(--text-secondary)]">
                    {entry.actor} · {entry.target}
                  </p>
                  {entry.reason ? (
                    <p className="t-compact mt-3 rounded-panel bg-[var(--surface-sunken)] p-3 text-[var(--text-secondary)]">
                      {entry.reason}
                    </p>
                  ) : null}
                  <details className="t-caption mt-3 text-[var(--text-secondary)]">
                    <summary className="cursor-pointer">Reference</summary>
                    <p className="mt-2 font-mono break-all">{entry.requestId}</p>
                  </details>
                </div>
                <time dateTime={entry.at} className="t-caption text-[var(--text-secondary)]">
                  {entry.time}
                </time>
              </li>
            ))}
          </ol>
        )}
        {pages > 1 ? (
          <nav
            aria-label="Activity pages"
            className="mt-5 flex flex-wrap items-center justify-between gap-3"
          >
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              className="t-compact min-h-11 rounded-overlay border border-[var(--border-subtle)] px-4 disabled:opacity-40"
            >
              Previous
            </button>
            <p role="status" className="t-caption">
              Page {current + 1} of {pages}
            </p>
            <button
              type="button"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
              className="t-compact min-h-11 rounded-overlay border border-[var(--border-subtle)] px-4 disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        ) : null}
      </Panel>
    </div>
  );
}
