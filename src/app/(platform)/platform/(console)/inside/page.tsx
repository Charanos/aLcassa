import type { Metadata } from 'next';
import Link from 'next/link';
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
import {
  getLiveCompany,
  getLiveSubscription,
  getLiveTeam,
  getLiveTenantAudit,
} from '@/lib/tenant/live';

export const metadata: Metadata = { title: 'Inside a workspace' };

/**
 * INSIDE A CUSTOMER'S WORKSPACE. Doc 24 · Stage 3.
 *
 * ⚠ THE PAGE THAT MAKES A SUPPORT SESSION A SUPPORT SESSION. Until now a
 * session opened no view: it was a record and a countdown. This renders the
 * customer's workspace through the support door (`resolveSupportContext`) —
 * the SAME read models their own staff's pages use, run as role `support`
 * under the workspace's own row-level security. Nothing here is a
 * console-only query with wider reach; if the customer's staff could not see
 * it, neither can the operator.
 *
 * A revoked or lapsed visit resolves no context, so this page shows nothing
 * of the customer's the moment the visit ends — including when the customer
 * ends it themselves.
 */
export default async function InsidePage() {
  const sessionId = await resolveSupportSessionId();
  const ctx = sessionId ? await resolveSupportContext(sessionId) : null;

  if (!ctx) {
    return (
      <ConsolePage>
        <ConsoleHeader
          breadcrumbs={[
            { label: 'Platform Console', href: '/platform' },
            { label: 'Support sessions', href: '/platform/support-sessions' },
            { label: 'Inside' },
          ]}
          title="Not inside a workspace"
        />
        <p className="t-body mt-4 max-w-[64ch]" style={{ color: 'var(--text-secondary)' }}>
          There is no open support visit for you. It may have reached its time limit, been ended by
          the customer, or been closed by a colleague — the register says which.
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
  }

  const [company, subscription, team, audit] = await Promise.all([
    getLiveCompany(ctx),
    getLiveSubscription(ctx),
    getLiveTeam(ctx),
    getLiveTenantAudit(ctx),
  ]);

  const seats = subscription?.entitlements.find((e) => e.key === 'seats');

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[
          { label: 'Platform Console', href: '/platform' },
          { label: 'Support sessions', href: '/platform/support-sessions' },
          { label: ctx.tenantName },
        ]}
        eyebrow="Inside · role support"
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
          title="People"
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
          title="Their activity"
          note="The workspace's own log, as its owner reads it. Your actions appear here."
          align="right"
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
                  <span style={{ color: 'var(--text-primary)' }}>{a.actor}</span> {a.action}{' '}
                  <span className="break-all">{a.target}</span>
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
          title="Not in the workspace yet"
          note="Stated so its absence is not mistaken for a permission."
        />
        <Panel variant="elevated">
          <p
            className="t-compact"
            style={{ color: 'var(--text-secondary)', textWrap: 'pretty', maxWidth: '72ch' }}
          >
            AI rules, the knowledge base and channel connections are not yet saved in the
            customer&rsquo;s own workspace &mdash; their pages there show designed content and do
            not persist &mdash; so there is nothing real to read or correct here. They will appear
            on this page, under the same rules, when they are stored for the customer.
          </p>
        </Panel>
      </section>
    </ConsolePage>
  );
}
