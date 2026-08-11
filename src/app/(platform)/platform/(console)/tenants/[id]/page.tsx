import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  IconChevronRight,
  IconCreditCard,
  IconDatabase,
  IconKey,
  IconMail,
  IconShieldCheck,
  IconUsers,
  IconBolt,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { ConsolePage, Panel } from '@/components/console/Surface';
import { WorkspaceActions } from '@/components/console/WorkspaceActions';
import { getWorkspaceDetail, type Meter, type WorkspaceDetail } from '@/lib/console/data';
import { startSupportSession } from '../../actions';

/**
 * One workspace. `Workspace-Detail.dc.html`.
 *
 * ⚠ THE TABS ARE URL STATE, NOT COMPONENT STATE.
 *
 * The design holds the active tab in `this.state.tab`. Here it is a search
 * param, which buys four things a preview does not need and a console does:
 * the back button steps between tabs, a billing dispute can be linked to
 * directly, a refresh stays where the operator was, and each tab can be a
 * server component that fetches only what it shows.
 *
 * The stub tabs are honest about being stubs. Each carries the sentence the
 * design wrote for it describing what will live there — which is more useful
 * to a reviewer than a spinner, and more honest than an empty panel.
 */

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'billing', label: 'Billing' },
  {
    key: 'staff',
    label: 'Staff',
    note: 'Roster with roles, last sign-in, and seat consumption. No credential value is reachable here.',
  },
  {
    key: 'channels',
    label: 'Channels',
    note: 'WhatsApp, email, web widget and SMS connections, with health per channel and last inbound event.',
  },
  {
    key: 'rules',
    label: 'AI rules',
    note: "Master rules inherited from the platform, plus this workspace's own overrides and their propagation state.",
  },
  {
    key: 'audit',
    label: 'Activity',
    note: "This workspace's own audit trail, including every support session the platform team opened against it.",
  },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const METER_ICON: Record<Meter['icon'], TablerIcon> = {
  seat: IconUsers,
  bolt: IconBolt,
  mail: IconMail,
  db: IconDatabase,
  key: IconKey,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const w = await getWorkspaceDetail(id);
  return { title: w?.name ?? 'Workspace' };
}

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const w = await getWorkspaceDetail(id);

  /*
   * 02 §11 · 07 §1: 404, never 403. A workspace the operator cannot see must
   * be indistinguishable from one that does not exist — a 403 confirms the
   * row is there, which is an information leak even inside the console.
   */
  if (!w) notFound();

  const active: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : 'overview';
  const stub = TABS.find((t) => t.key === active && 'note' in t);

  return (
    <div>
      <div className="mx-auto px-5 pt-5 md:px-8" style={{ maxWidth: 1440 }}>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2">
          <Link
            href="/platform/tenants"
            className="t-compact whitespace-nowrap"
            style={{ color: 'var(--text-secondary)' }}
          >
            Workspaces
          </Link>
          <IconChevronRight
            size={13}
            stroke={1.5}
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden
          />
          <span
            style={{ font: '400 var(--text-sm)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
          >
            {w.slug}
          </span>
        </nav>

        <div className="mt-3.5 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="display display-lg" style={{ color: 'var(--text-primary)' }}>
                {w.name}
              </h1>
              <span
                className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-3 whitespace-nowrap"
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-fg)',
                  font: '500 12px/1 var(--font-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
                {w.status}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Meta mono>{w.id}</Meta>
              <Rule />
              <Meta>
                {w.plan} · {w.monthlyValue}
              </Meta>
              <Rule />
              <Meta>{w.since}</Meta>
              <Rule />
              <Meta>{w.lastActive}</Meta>
            </div>
          </div>

          <WorkspaceActions
            workspace={{
              id: w.id,
              name: w.name,
              slug: w.slug,
              plan: w.plan,
              initials: w.owner.initials,
            }}
            impact={w.impact}
            onStartSession={startSupportSession}
          />
        </div>

        {/* Tabs. Real links, so they are middle-clickable and crawlable. */}
        <div
          role="tablist"
          className="mt-5 flex items-center gap-0.5 overflow-x-auto"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {TABS.map((t) => {
            const on = t.key === active;
            return (
              <Link
                key={t.key}
                role="tab"
                aria-selected={on}
                href={`/platform/tenants/${w.slug}?tab=${t.key}`}
                scroll={false}
                className="relative h-[38px] shrink-0 px-3.5 leading-[38px] whitespace-nowrap transition-colors"
                style={{
                  color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                  font: `${on ? 500 : 400} var(--text-sm)/38px var(--font-ui)`,
                }}
              >
                {t.label}
                <span
                  aria-hidden
                  className="absolute right-2 -bottom-px left-2 h-0.5 rounded-full"
                  style={{ background: on ? 'var(--blue-500)' : 'transparent' }}
                />
              </Link>
            );
          })}
        </div>
      </div>

      <ConsolePage>
        {active === 'overview' ? <OverviewTab w={w} /> : null}
        {active === 'billing' ? <BillingTab w={w} /> : null}
        {stub ? (
          <div
            className="grid place-items-center rounded-overlay px-6 py-16"
            style={{
              border: '1px dashed var(--border-strong)',
              background: 'var(--surface-sunken)',
            }}
          >
            <p className="display display-sm" style={{ color: 'var(--text-primary)' }}>
              {stub.label}
            </p>
            <p
              className="t-compact mt-2 text-center"
              style={{ color: 'var(--text-secondary)', maxWidth: '54ch' }}
            >
              {'note' in stub ? stub.note : ''}
            </p>
          </div>
        ) : null}
      </ConsolePage>
    </div>
  );
}

function OverviewTab({ w }: { w: WorkspaceDetail }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-5">
        {w.alert ? (
          <div
            className="rounded-overlay p-5"
            style={{ border: '1px solid var(--danger-fg)', background: 'var(--danger-bg)' }}
          >
            <div className="flex flex-col items-start gap-3.5 sm:flex-row">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-panel"
                style={{ background: 'var(--surface-raised)', color: 'var(--danger-fg)' }}
                aria-hidden
              >
                <IconCreditCard size={18} stroke={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  style={{
                    font: '500 var(--text-base)/1.4 var(--font-ui)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {w.alert.title}
                </p>
                <p className="t-compact mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {w.alert.body}
                </p>
              </div>
              <div className="grid shrink-0 gap-1.5">
                <button
                  type="button"
                  className="t-compact h-[30px] rounded-panel px-3 whitespace-nowrap"
                  style={{ background: 'var(--blue-500)', color: '#ffffff', fontWeight: 500 }}
                >
                  Retry charge
                </button>
                <Link
                  href={`/platform/tenants/${w.slug}?tab=billing`}
                  className="t-compact flex h-[30px] items-center justify-center rounded-panel px-3 whitespace-nowrap"
                  style={{
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-raised)',
                    color: 'var(--text-primary)',
                  }}
                >
                  View invoice
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <Panel
          title={`Entitlements · ${w.plan}`}
          action={
            <span className="t-caption whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
              Resets in 19 days
            </span>
          }
        >
          {w.meters.map((m, i) => {
            const pct = m.used / m.limit;
            const Icon = METER_ICON[m.icon];
            /* Amber at 90%, red at 100% — the same threshold the list uses. */
            const ink =
              pct >= 1
                ? 'var(--danger-fg)'
                : pct >= 0.9
                  ? 'var(--warning-fg)'
                  : 'var(--blue-500)';
            const fmt = (n: number) =>
              `${n.toLocaleString('en-GB')}${m.unit ?? ''}`;
            return (
              <div
                key={m.label}
                className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:grid-cols-[168px_1fr_132px] sm:gap-4"
                style={{
                  borderBottom:
                    i === w.meters.length - 1 ? undefined : '1px solid var(--border-subtle)',
                }}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    size={17}
                    stroke={1.5}
                    className="shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-hidden
                  />
                  <span className="t-compact truncate" style={{ color: 'var(--text-primary)' }}>
                    {m.label}
                  </span>
                </span>
                <span
                  role="meter"
                  aria-valuenow={Math.round(pct * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${m.label}: ${Math.round(pct * 100)} percent of limit`}
                  className="order-3 block h-1.5 overflow-hidden rounded-full sm:order-none"
                  style={{ background: 'var(--surface-inset)', boxShadow: 'var(--neu-inset)' }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.min(100, pct * 100)}%`, background: ink }}
                  />
                </span>
                <span className="text-right whitespace-nowrap">
                  <span
                    className="numeric"
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: pct >= 0.9 ? ink : 'var(--text-primary)',
                    }}
                  >
                    {fmt(m.used)} / {fmt(m.limit)}
                  </span>{' '}
                  <span
                    style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                  >
                    · {Math.round(pct * 100)}%
                  </span>
                </span>
              </div>
            );
          })}
          <p className="t-compact mt-3.5" style={{ color: 'var(--text-tertiary)' }}>
            Overrides on this workspace take precedence over the plan. Two are set.
          </p>
        </Panel>
      </div>

      <div className="grid gap-5">
        <Panel title="Subscription">
          <div className="grid gap-3">
            {w.facts.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-3">
                <span className="t-compact whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {f.label}
                </span>
                <span
                  className="numeric text-right"
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: f.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)',
                  }}
                >
                  {f.value}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/platform/plans"
            className="t-compact mt-4 flex h-[34px] w-full items-center justify-center rounded-panel"
            style={{
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
            }}
          >
            Change plan
          </Link>
        </Panel>

        <Panel title="Owner">
          <div className="flex items-center gap-2.5">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full"
              style={{
                background: 'var(--blue-50)',
                color: 'var(--blue-500)',
                font: '500 13px/1 var(--font-mono)',
              }}
              aria-hidden
            >
              {w.owner.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="t-compact block truncate" style={{ color: 'var(--text-primary)' }}>
                {w.owner.name}
              </span>
              <span
                className="block truncate"
                style={{ font: '400 11.5px/1.35 var(--font-mono)', color: 'var(--text-tertiary)' }}
              >
                {w.owner.email}
              </span>
            </span>
          </div>
          <div
            className="mt-4 grid gap-2.5 border-t pt-3.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {(
              [
                ['Staff', w.team.staff],
                ['Admins', w.team.admins],
                ['Channels', w.team.channels],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </span>
                <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/*
          The isolation claim, restated on the surface where it is most likely
          to be doubted. An operator looking at someone else's workspace is
          exactly the person who should be reminded that the console cannot
          read message bodies — and 09 §4 makes that a product promise, not a
          reassurance.
        */}
        <section
          className="rounded-overlay p-5"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-sunken)',
          }}
        >
          <p className="t-eyebrow mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Data residency
          </p>
          <div className="flex items-center gap-2.5">
            <IconShieldCheck
              size={18}
              stroke={1.5}
              className="shrink-0"
              style={{ color: 'var(--success-fg)' }}
              aria-hidden
            />
            <span className="t-compact" style={{ color: 'var(--text-primary)' }}>
              {w.residency}
            </span>
          </div>
          <p className="t-compact mt-2.5" style={{ color: 'var(--text-secondary)' }}>
            No console route can read this workspace&rsquo;s message bodies or credential values.
          </p>
        </section>
      </div>
    </div>
  );
}

function BillingTab({ w }: { w: WorkspaceDetail }) {
  return (
    <div className="grid gap-5">
      <div
        className="grid gap-3.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}
      >
        {w.billingStats.map((b) => (
          <div
            key={b.label}
            className="min-w-0 rounded-overlay p-4"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-raised)',
              boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
            }}
          >
            <p className="t-compact whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
              {b.label}
            </p>
            <p
              className="numeric mt-2.5"
              style={{
                fontSize: 'var(--display-sm)',
                color: b.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)',
              }}
            >
              {b.value}
            </p>
            <p className="t-caption mt-2" style={{ color: 'var(--text-tertiary)' }}>
              {b.note}
            </p>
          </div>
        ))}
      </div>

      <Panel title="Invoices" flush>
        {/* Below `sm` the invoice table becomes a definition list rather than
            a sideways scroller — same rule as the workspace list. */}
        <div className="hidden sm:block">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'var(--surface-sunken)' }}>
                {['Invoice', 'Issued', 'Period', 'Amount', 'Status', 'Paid'].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className="h-9"
                    style={{
                      padding: i === 0 ? '0 20px' : '0 8px',
                      textAlign: h === 'Amount' || h === 'Paid' ? 'right' : 'left',
                      borderBottom: '1px solid var(--border-subtle)',
                      font: '500 11px/1 var(--font-ui)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {w.invoices.map((inv) => (
                <tr
                  key={inv.id}
                  style={{ height: 44, borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <Cell pad="0 20px">{inv.id}</Cell>
                  <Cell tone="secondary">{inv.issued}</Cell>
                  <Cell tone="tertiary">{inv.period}</Cell>
                  <Cell align="right">{inv.amount}</Cell>
                  <td style={{ padding: '0 8px' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-[7px] shrink-0 rounded-full"
                        style={{
                          background:
                            inv.status === 'paid' ? 'var(--success-fg)' : 'var(--danger-fg)',
                        }}
                      />
                      <span
                        style={{
                          font: '400 var(--text-sm)/1 var(--font-mono)',
                          color:
                            inv.status === 'paid'
                              ? 'var(--text-secondary)'
                              : 'var(--danger-fg)',
                        }}
                      >
                        {inv.status}
                      </span>
                    </span>
                  </td>
                  <Cell pad="0 20px" align="right" tone="tertiary">
                    {inv.paid}
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-2 p-4 sm:hidden">
          {w.invoices.map((inv) => (
            <div
              key={inv.id}
              className="rounded-panel p-3"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                  {inv.id}
                </span>
                <span
                  style={{
                    font: '400 11px/1 var(--font-mono)',
                    color: inv.status === 'paid' ? 'var(--success-fg)' : 'var(--danger-fg)',
                  }}
                >
                  {inv.status}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                  {inv.period}
                </span>
                <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                  {inv.amount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <p className="t-compact" style={{ color: 'var(--text-tertiary)', maxWidth: '84ch' }}>
        Read-only against <em>subscriptions</em> and <em>invoices</em>. Gateway integration is out
        of Phase 1 scope, so <em>Retry charge</em> queues a request for the finance operator rather
        than moving money.
      </p>
    </div>
  );
}

function Cell({
  children,
  pad = '0 8px',
  align = 'left',
  tone = 'primary',
}: {
  children: React.ReactNode;
  pad?: string;
  align?: 'left' | 'right';
  tone?: 'primary' | 'secondary' | 'tertiary';
}) {
  const ink =
    tone === 'secondary'
      ? 'var(--text-secondary)'
      : tone === 'tertiary'
        ? 'var(--text-tertiary)'
        : 'var(--text-primary)';
  return (
    <td style={{ padding: pad, textAlign: align }}>
      <span style={{ font: '400 var(--text-sm)/1 var(--font-mono)', color: ink }}>{children}</span>
    </td>
  );
}

function Meta({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      style={{
        font: `400 var(--text-sm)/1 ${mono ? 'var(--font-mono)' : 'var(--font-ui)'}`,
        color: mono ? 'var(--text-tertiary)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </span>
  );
}

function Rule() {
  return (
    <span
      aria-hidden
      className="hidden sm:block"
      style={{ width: 1, height: 14, background: 'var(--border-subtle)' }}
    />
  );
}
