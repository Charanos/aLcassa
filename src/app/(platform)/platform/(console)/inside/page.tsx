import type { Metadata } from 'next';
import Link from '@/components/structure/NavigationLink';
import { IconBuilding, IconCreditCard, IconShieldCheck, IconUsers } from '@tabler/icons-react';
import {
  ConsoleHeader,
  ConsolePage,
  DataSource,
  Panel,
  SectionHeading,
} from '@/components/console/Surface';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { InvitationActions } from '@/components/console/inside/InvitationActions';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { resolveSupportContext } from '@/lib/auth/resolve';
import { resolveSupportSessionId } from '@/lib/console/session';
import { ERROR_CODES, isAppError } from '@/lib/errors';
import {
  getLiveCompany,
  getLiveSubscription,
  getLiveTeam,
  getLiveTenantAudit,
} from '@/lib/tenant/live';

export const metadata: Metadata = { title: 'Inside a workspace' };

/** Support reads reuse tenant models and RLS; an expired or revoked visit resolves no customer context. */
export default async function InsidePage() {
  const sessionId = await resolveSupportSessionId();
  const ctx = sessionId ? await resolveSupportContext(sessionId) : null;

  const endedVisit = (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[
          { label: 'Platform Console', href: '/platform' },
          { label: 'Support sessions', href: '/platform/support-sessions' },
          { label: 'Inside' },
        ]}
        title="Not inside a workspace"
      />
      <p className="t-body mt-4" style={{ color: 'var(--text-secondary)' }}>
        No support visit is available to this account. It may have ended, reached its time limit, or
        your support permission may have changed. Review the register for its recorded status.
      </p>
      <Link
        href="/platform/support-sessions"
        className="t-compact mt-5 inline-flex h-9 items-center rounded-panel px-4"
        style={{ background: 'var(--blue-500)', color: 'var(--text-inverse)', fontWeight: 500 }}
      >
        Open Support sessions
      </Link>
    </ConsolePage>
  );
  if (!ctx) return endedVisit;

  const result = await Promise.all([
    getLiveCompany(ctx),
    getLiveSubscription(ctx),
    getLiveTeam(ctx),
    getLiveTenantAudit(ctx),
  ]).catch((error: unknown) => {
    if (isAppError(error) && error.code === ERROR_CODES.SUPPORT_SESSION_EXPIRED) return null;
    throw error;
  });
  // Do not emit customer data if the visit ended while its readers were running.
  if (!result || !(await resolveSupportContext(sessionId!))) return endedVisit;
  const [company, subscription, team, audit] = result;

  const seats = subscription?.entitlements.find((e) => e.key === 'seats');

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[
          { label: 'Platform Console', href: '/platform' },
          { label: 'Support sessions', href: '/platform/support-sessions' },
          { label: ctx.tenantName },
        ]}
        eyebrow="Support visit"
        title={ctx.tenantName}
      />

      <div
        className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card px-5 py-4"
        style={{
          background: 'color-mix(in oklab, var(--orange-500) 8%, var(--surface-raised))',
          border: '1px solid color-mix(in oklab, var(--orange-500) 35%, var(--border-subtle))',
        }}
      >
        <IconShieldCheck
          size={18}
          stroke={1.5}
          aria-hidden
          style={{ color: 'var(--orange-500)' }}
        />
        <p
          className="t-compact min-w-0 flex-1"
          style={{ color: 'var(--text-primary)', textWrap: 'pretty' }}
        >
          You are reading {ctx.tenantName} under its own access rules, as role support. Every change
          you make is written to their activity log with your name, and their owners and admins can
          end this visit at any time.
        </p>
        <DataSource
          kind="live"
          detail="as support"
          explain="Read through the support door, under the workspace's own row-level security."
        />
      </div>

      <FactStrip label={`${ctx.tenantName} at a glance`}>
        <FactCell
          icon={IconCreditCard}
          label="Plan"
          value={subscription?.planName ?? 'No plan'}
          note={
            subscription
              ? `${subscription.status.replace('_', ' ')} · renews ${subscription.periodEnd}`
              : 'No subscription on record.'
          }
        />
        <FactCell
          icon={IconUsers}
          label="Seats"
          value={
            team
              ? `${team.seatsUsed}${team.seatsLimit === null ? '' : ` of ${team.seatsLimit}`}`
              : '—'
          }
          note="Active members and pending invitations."
          tone={
            seats && seats.limit !== null && seats.current >= seats.limit ? 'warning' : 'neutral'
          }
        />
        <FactCell
          icon={IconBuilding}
          label="Contact"
          value={company?.contactEmail || 'None set'}
          note={company ? `${company.timezone} · ${company.locale}` : undefined}
        />
        <FactCell
          icon={IconShieldCheck}
          label="Their log"
          value={audit ? `${audit.entries.length} recent` : 'Not readable'}
          note="What they will see of this visit, below."
        />
      </FactStrip>

      {subscription ? (
        <section aria-labelledby="inside-usage">
          <SectionHeading
            id="inside-usage"
            title="Usage"
            note="Against their plan's limits, as their owner sees it."
          />
          <Panel variant="elevated">
            <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
              {subscription.entitlements.map((e) => {
                const pct = e.limit ? Math.min(100, (e.current / e.limit) * 100) : 0;
                return (
                  <li key={e.key} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                        {e.label}
                      </span>
                      <span
                        className="t-compact tabular-nums"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {e.kind === 'feature'
                          ? e.limit === 0
                            ? 'Not included'
                            : 'Included'
                          : `${e.current}${e.limit === null ? ' · unlimited' : ` of ${e.limit}`}`}
                      </span>
                    </div>
                    {e.kind === 'limit' && e.limit !== null ? (
                      <span
                        className="block h-1.5 overflow-hidden rounded-full"
                        style={{ background: 'var(--surface-inset)' }}
                        aria-hidden
                      >
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 90 ? 'var(--warning-fg)' : 'var(--blue-400)',
                          }}
                        />
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </section>
      ) : null}

      <section aria-labelledby="inside-people">
        <SectionHeading
          id="inside-people"
          title="People"
          align={subscription ? 'left' : 'right'}
          note="Members and pending invitations. You can resend or revoke an invitation."
          action={<DataSource kind="live" detail="as support" />}
        />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Panel title="Members" variant="elevated" flush>
            <ul className="m-0 list-none p-0">
              {(team?.members ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <span className="min-w-0">
                    <span
                      className="t-compact block truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {m.name}
                    </span>
                    <span
                      className="t-caption block truncate"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {m.email}
                    </span>
                  </span>
                  <StatusBadge tone={m.role === 'owner' ? 'brand' : 'neutral'} size="sm">
                    {m.role}
                  </StatusBadge>
                </li>
              ))}
              {team && team.members.length === 0 ? (
                <li className="t-compact px-5 py-4" style={{ color: 'var(--text-tertiary)' }}>
                  No members.
                </li>
              ) : null}
            </ul>
          </Panel>
          <Panel title="Pending invitations" variant="elevated" flush>
            <ul className="m-0 list-none p-0">
              {(team?.invitations ?? []).map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <span className="min-w-0">
                    <span
                      className="t-compact block truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {i.email}
                    </span>
                    <span
                      className="t-caption block"
                      style={{
                        color:
                          i.status === 'expired' ? 'var(--warning-fg)' : 'var(--text-tertiary)',
                      }}
                    >
                      {i.role} ·{' '}
                      {i.status === 'expired' ? `expired ${i.expiresAt}` : `sent ${i.sentAt}`}
                    </span>
                  </span>
                  <InvitationActions id={i.id} email={i.email} tenantName={ctx.tenantName} />
                </li>
              ))}
              {team && team.invitations.length === 0 ? (
                <li className="t-compact px-5 py-4" style={{ color: 'var(--text-tertiary)' }}>
                  No invitations are pending.
                </li>
              ) : null}
            </ul>
          </Panel>
        </div>
      </section>

      <section aria-labelledby="inside-activity">
        <SectionHeading
          id="inside-activity"
          title="Their activity"
          note="The workspace's own log, as its owner reads it. Your actions appear here."
          align={subscription ? 'right' : 'left'}
        />
        <Panel variant="elevated" flush>
          <ul className="m-0 list-none p-0">
            {(audit?.entries ?? []).slice(0, 20).map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 px-5 py-3"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                  {a.time}
                </span>
                <span className="t-compact min-w-0" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{a.actor}</span>{' '}
                  {a.actionLabel ?? a.action} <span className="break-all">{a.target}</span>
                </span>
              </li>
            ))}
            {audit && audit.entries.length === 0 ? (
              <li className="t-compact px-5 py-4" style={{ color: 'var(--text-tertiary)' }}>
                Nothing recorded yet.
              </li>
            ) : null}
          </ul>
        </Panel>
      </section>

      <section aria-labelledby="inside-not-built" className="pb-4">
        <SectionHeading
          id="inside-not-built"
          title="Scope of this visit"
          note="Customer access stays limited to the supported operations."
          align={subscription ? 'left' : 'right'}
        />
        <Panel variant="elevated">
          <p className="t-compact" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}>
            This view provides company details, subscription usage, members, invitations and recent
            activity. You can resend or revoke an invitation. Account credentials and ownership
            changes remain outside this support view.
          </p>
        </Panel>
      </section>
    </ConsolePage>
  );
}
