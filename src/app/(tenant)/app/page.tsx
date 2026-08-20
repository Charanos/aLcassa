import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/feedback/Badge';
import { Stat } from '@/components/feedback/Stat';
import { getOverview } from '@/lib/tenant/data';

export const metadata: Metadata = { title: 'Overview' };

/**
 * 02 §4. The tenant overview: plan usage, team size, recent activity, the
 * setup checklist.
 *
 * ⚠ THE SETUP CHECKLIST IS THE HIGHEST-VALUE FOUR HOURS IN THE TENANT
 * APPLICATION. A B2B owner's entire first impression is whether they knew
 * what to do next, and this audience will use the product for twenty
 * minutes in week one and five minutes a month afterwards.
 *
 * It disappears PERMANENTLY once complete and it never reappears. A
 * checklist that comes back is a nag. Copy from 10 §4.
 */
export default async function OverviewPage() {
  const m = await getOverview();
  const complete = m.checklist.every((step) => step.done);

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="t-title text-[var(--ink-primary)]">
          Good to see you, {m.operatorFirstName}
        </h1>
        <Badge tone="active">{m.planStatus === 'active' ? 'Active' : m.planStatus}</Badge>
      </div>

      {/* ── Plan usage and team size ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Plan" value={m.planName} />
        <Stat
          label="Staff seats"
          value={m.seats.limit ? `${m.seats.used} / ${m.seats.limit}` : `${m.seats.used}`}
        />
        <Stat
          label="Channel connections"
          value={m.channels.limit ? `${m.channels.used} / ${m.channels.limit}` : `${m.channels.used}`}
        />
      </div>

      {/* ── Setup checklist ──────────────────────────────────────────── */}
      {complete ? null : (
        <section
          data-slot="panel"
          aria-labelledby="setup-heading"
          className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] p-5"
        >
          <h2 id="setup-heading" className="t-panel text-[var(--ink-primary)]">
            Set up your workspace
          </h2>
          <p className="t-compact mt-1 text-[var(--ink-secondary)]">
            Five steps. You can come back to any of them.
          </p>

          <ol className="mt-4 grid">
            {m.checklist.map((step, index) => (
              <li
                key={step.key}
                className="flex items-center gap-3 border-t py-3 first:border-t-0"
                style={{ borderColor: 'var(--rule-soft)' }}
              >
                <span className="t-data w-5 text-[var(--ink-tertiary)]">{index + 1}</span>
                {step.done ? (
                  <span className="t-body flex-1" style={{ color: 'var(--ink-tertiary)' }}>
                    {step.doneLabel}
                  </span>
                ) : (
                  <Link
                    href={step.href}
                    className="t-body flex-1 text-[var(--ink-primary)] transition-colors hover:text-[var(--copper-ink)]"
                  >
                    {step.label}
                  </Link>
                )}
                {step.done ? <Badge tone="active">Done</Badge> : null}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Recent activity ──────────────────────────────────────────── */}
      <section
        data-slot="panel"
        aria-labelledby="activity-heading"
        className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="activity-heading" className="t-panel text-[var(--ink-primary)]">
            Recent activity
          </h2>
          <Link
            href="/app/settings/audit"
            className="t-compact text-[var(--ink-tertiary)] transition-colors hover:text-[var(--copper-ink)]"
          >
            View all
          </Link>
        </div>

        <ul className="mt-3 grid">
          {m.recentActivity.map((line, i) => (
            <li
              key={`${line.time}-${i}`}
              className="flex items-baseline justify-between gap-4 border-t py-2.5 first:border-t-0"
              style={{ borderColor: 'var(--rule-soft)' }}
            >
              <span className="t-body text-[var(--ink-primary)]">
                <span className="font-medium">{line.actor}</span> {line.action}
              </span>
              <span className="t-data shrink-0 text-[var(--ink-tertiary)]">{line.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
