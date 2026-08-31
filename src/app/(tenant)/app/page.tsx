import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/feedback/Badge';
import { DashboardHero } from '@/components/tenant/DashboardHero';
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
    <div className="grid gap-12">
      <DashboardHero
        planName={m.planName}
        planStatus={m.planStatus}
        operatorFirstName={m.operatorFirstName}
        seats={{ used: m.seats.used, limit: m.seats.limit ?? undefined }}
        channels={{ used: m.channels.used, limit: m.channels.limit ?? undefined }}
      />

      {/* ── Setup checklist ──────────────────────────────────────────── */}
      {complete ? null : (
        <section
          data-slot="panel"
          aria-labelledby="setup-heading"
          className="gsap-reveal rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 md:p-8"
        >
          <h2 id="setup-heading" className="t-panel text-[var(--text-primary)]">
            Set up your workspace
          </h2>
          <p className="t-compact mt-1 text-[var(--text-secondary)]">
            Five steps. You can come back to any of them.
          </p>

          <ol className="mt-4 grid">
            {m.checklist.map((step, index) => (
              <li
                key={step.key}
                className="flex items-center gap-3 border-t py-3 first:border-t-0"
                style={{ borderColor: 'var(--ink-100)' }}
              >
                <span className="t-data w-5 text-[var(--text-tertiary)]">{index + 1}</span>
                {step.done ? (
                  <span className="t-body flex-1" style={{ color: 'var(--text-tertiary)' }}>
                    {step.doneLabel}
                  </span>
                ) : (
                  <Link
                    href={step.href}
                    className="t-body flex-1 text-[var(--text-primary)] transition-colors hover:text-[var(--blue-500)]"
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
        className="gsap-reveal rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 md:p-8"
      >
        <div className="flex items-center justify-between">
          <h2 id="activity-heading" className="t-panel text-[var(--text-primary)]">
            Recent activity
          </h2>
          <Link
            href="/app/settings/audit"
            className="t-compact text-[var(--text-tertiary)] transition-colors hover:text-[var(--blue-500)]"
          >
            View all
          </Link>
        </div>

        <ul className="mt-3 grid">
          {m.recentActivity.map((line, i) => (
            <li
              key={`${line.time}-${i}`}
              className="flex items-baseline justify-between gap-4 border-t py-2.5 first:border-t-0"
              style={{ borderColor: 'var(--ink-100)' }}
            >
              <span className="t-body text-[var(--text-primary)]">
                <span className="font-medium">{line.actor}</span> {line.action}
              </span>
              <span className="t-data shrink-0 text-[var(--text-tertiary)]">{line.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
