import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { IconChevronRight } from '@tabler/icons-react';
import { ConsolePage } from '@/components/console/Surface';
import { WorkspaceActions } from '@/components/console/WorkspaceActions';
import {
  getWorkspaceDetail,
  getWorkspaceStaff,
  getWorkspaceChannels,
  getWorkspaceRules,
  getWorkspaceActivity,
  PORTFOLIO_COUNT,
} from '@/lib/console/data';
import { startSupportSession } from '../../actions';

import { OverviewTab } from '@/components/console/tenant/OverviewTab';
import { BillingTab } from '@/components/console/tenant/BillingTab';
import { StaffTab } from '@/components/console/tenant/StaffTab';
import { ChannelsTab } from '@/components/console/tenant/ChannelsTab';
import { RulesTab } from '@/components/console/tenant/RulesTab';
import { ActivityTab } from '@/components/console/tenant/ActivityTab';

/**
 * 02 §6 · 09 §1. One workspace comprehensive detail view.
 */

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'billing', label: 'Billing' },
  { key: 'staff', label: 'Staff' },
  { key: 'channels', label: 'Channels' },
  { key: 'rules', label: 'AI Rules' },
  { key: 'audit', label: 'Activity' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const w = await getWorkspaceDetail(id);
  return { title: w ? `${w.name} · Workspace` : 'Workspace' };
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

  if (!w) notFound();

  const active: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : 'overview';

  return (
    <ConsolePage>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-2">
        <Link
          href="/platform/tenants"
          className="t-compact whitespace-nowrap transition-colors hover:text-[var(--text-primary)]"
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

      {/* Header Title & Actions */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="display display-md tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {w.name}
            </h1>
            <span
              className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-3 whitespace-nowrap"
              style={{
                background:
                  w.status === 'active'
                    ? 'rgba(16, 185, 129, 0.1)'
                    : w.status === 'past due'
                      ? 'var(--danger-bg)'
                      : 'var(--surface-inset)',
                color:
                  w.status === 'active'
                    ? 'var(--success-fg)'
                    : w.status === 'past due'
                      ? 'var(--danger-fg)'
                      : 'var(--text-secondary)',
                font: '500 12px/1 var(--font-mono)',
                letterSpacing: '0.04em',
              }}
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{
                  background:
                    w.status === 'active'
                      ? 'var(--success-fg)'
                      : w.status === 'past due'
                        ? 'var(--danger-fg)'
                        : 'var(--text-secondary)',
                }}
              />
              {w.status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
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

      {/* Tab Navigation */}
      <div
        role="tablist"
        className="mt-6 mb-7 flex items-center gap-1 overflow-x-auto"
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
              className="relative h-10 shrink-0 px-4 leading-10 whitespace-nowrap transition-colors"
              style={{
                color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                font: `${on ? 500 : 400} var(--text-sm)/40px var(--font-ui)`,
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

      {/* Tab Contents */}
      {active === 'overview' ? <OverviewTab w={w} /> : null}
      {active === 'billing' ? <BillingTab w={w} /> : null}
      {active === 'staff' ? <StaffTab w={w} staff={await getWorkspaceStaff(w.slug)} /> : null}
      {active === 'channels' ? <ChannelsTab channels={await getWorkspaceChannels(w.slug)} /> : null}
      {active === 'rules' ? <RulesTab rules={await getWorkspaceRules(w.slug)} workspaceCount={PORTFOLIO_COUNT} /> : null}
      {active === 'audit' ? <ActivityTab activity={await getWorkspaceActivity(w.slug)} /> : null}
    </ConsolePage>
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
