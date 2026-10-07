import Link from 'next/link';
import { IconCreditCard, IconArmchair, IconKey, IconUsers } from '@tabler/icons-react';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { Panel, SectionHeading } from '@/components/console/Surface';
import type { WorkspaceDetail } from '@/lib/console/data';

export function OverviewTab({ w }: { w: WorkspaceDetail }) {
  const seats = w.meters.find((meter) => meter.icon === 'seat');
  const credentials = w.meters.find((meter) => meter.icon === 'key');
  return (
    <div>
      <FactStrip label="Workspace at a glance">
        <FactCell
          icon={IconCreditCard}
          label="Subscription plan"
          value={w.plan}
          note={
            w.monthlyValue === '—'
              ? 'Monthly contract value is not available.'
              : `${w.monthlyValue} contracted`
          }
        />
        <FactCell
          icon={IconUsers}
          label="Team members"
          value={w.team.staff}
          note={`${w.team.admins} ${w.team.admins === '1' ? 'administrator' : 'administrators'}`}
        />
        <FactCell
          icon={IconKey}
          label="API credentials"
          value={credentials?.used ?? '—'}
          note={
            credentials
              ? credentials.limit === null
                ? 'No credential limit'
                : `${credentials.limit} allowed by the current plan`
              : 'Usage is not available.'
          }
        />
        <FactCell
          icon={IconArmchair}
          label="Staff seats"
          value={seats?.used ?? '—'}
          note={
            seats
              ? seats.limit === null
                ? 'No seat limit'
                : `${seats.limit} ${seats.limit === 1 ? 'seat' : 'seats'} allowed by the plan`
              : 'Usage is not available.'
          }
        />
      </FactStrip>
      {w.alert ? (
        <div
          role="status"
          className="mt-6 rounded-card border border-[var(--border-subtle)] bg-[var(--warning-bg)] p-5"
        >
          <p className="t-body font-medium">{w.alert.title}</p>
          <p className="t-compact mt-1">{w.alert.body}</p>
        </div>
      ) : null}
      <SectionHeading
        title="Usage and subscription"
        note="Recorded usage against this workspace’s current limits."
        align="right"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Plan allowances">
          {w.meters.length === 0 ? (
            <p className="t-body text-[var(--text-secondary)]">
              No measured allowances are available for this workspace.
            </p>
          ) : (
            <div className="grid gap-4">
              {w.meters.map((meter) => {
                const bounded = meter.limit !== null;
                const ratio =
                  meter.limit === null
                    ? 0
                    : meter.limit === 0
                      ? meter.used > 0
                        ? 1
                        : 0
                      : meter.used / meter.limit;
                const tone =
                  ratio >= 1
                    ? 'var(--danger-fg)'
                    : ratio >= 0.9
                      ? 'var(--warning-fg)'
                      : 'var(--blue-500)';
                const allowance =
                  meter.limit === null ? 'Unlimited' : meter.limit.toLocaleString('en-KE');
                return (
                  <div
                    key={meter.label}
                    data-source={meter.source}
                    className="rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="t-body font-medium">{meter.label}</p>
                      <p className="t-compact text-[var(--text-secondary)] tabular-nums">
                        {meter.used.toLocaleString('en-KE')} / {allowance}
                      </p>
                    </div>
                    {bounded ? (
                      <div
                        role="meter"
                        aria-label={meter.label}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(100, Math.round(ratio * 100))}
                        aria-valuetext={`${meter.used} used of ${meter.limit} allowed`}
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-inset)]"
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, ratio * 100))}%`,
                            background: tone,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <p className="t-caption mt-4 text-[var(--text-secondary)]">
            Active workspace overrides are included in these limits.
          </p>
        </Panel>
        <Panel title="Subscription details">
          <dl className="divide-y divide-[var(--border-subtle)]">
            {w.facts.map((fact) => (
              <div key={fact.label} className="flex flex-wrap justify-between gap-3 py-3">
                <dt className="t-compact text-[var(--text-secondary)]">{fact.label}</dt>
                <dd
                  className="t-compact font-medium"
                  style={{
                    color: fact.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)',
                  }}
                >
                  {fact.value.replaceAll('_', ' ')}
                </dd>
              </div>
            ))}
          </dl>
          <Link
            href={`/platform/tenants/${w.slug}?tab=billing`}
            className="t-compact mt-5 inline-flex min-h-11 items-center justify-center rounded-overlay border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 text-[var(--text-action)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)]"
          >
            Manage subscription
          </Link>
        </Panel>
      </div>
      <SectionHeading
        title="Workspace ownership"
        note="The primary contact and the boundary for customer access."
        align="left"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Workspace owner">
          <div className="flex items-center gap-4 rounded-overlay bg-[var(--surface-raised)] p-4">
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-overlay bg-[var(--surface-inset)] text-sm font-medium"
            >
              {w.owner.initials}
            </span>
            <div className="min-w-0">
              <p className="t-body font-medium">{w.owner.name}</p>
              <p className="t-compact mt-1 break-all text-[var(--text-secondary)]">
                {w.owner.email}
              </p>
            </div>
          </div>
        </Panel>
        <Panel title="Customer access">
          <p className="t-body text-[var(--text-secondary)]">
            Open a support session to inspect customer settings and team records. The visit requires
            a reason and has a limited duration.
          </p>
          <p className="t-caption mt-4 text-[var(--text-secondary)]">
            The workspace actions above provide the support-session entry point.
          </p>
        </Panel>
      </div>
    </div>
  );
}
