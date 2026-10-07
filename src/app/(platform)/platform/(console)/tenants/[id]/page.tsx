import Link from '@/components/structure/NavigationLink';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { IconLock, IconPlugConnected } from '@tabler/icons-react';
import {
  ConsoleHeader,
  ConsolePage,
  DataSource,
  Panel,
  SectionHeading,
} from '@/components/console/Surface';
import { WorkspaceActions } from '@/components/console/WorkspaceActions';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import {
  getWorkspaceDetail,
  getWorkspaceStaff,
  getWorkspaceChannels,
  getWorkspaceRules,
  getWorkspaceActivity,
  PORTFOLIO_COUNT,
  getPlans,
} from '@/lib/console/data';
import { getLivePlans } from '@/lib/console/live';
import { getLiveAuditEntries, getLiveWorkspaceDetail } from '@/lib/console/liveWorkspaces';
import { startSupportSession } from '../../actions';
import { OverviewTab } from '@/components/console/tenant/OverviewTab';
import { BillingTab } from '@/components/console/tenant/BillingTab';
import { StaffTab } from '@/components/console/tenant/StaffTab';
import { ChannelsTab } from '@/components/console/tenant/ChannelsTab';
import { RulesTab } from '@/components/console/tenant/RulesTab';
import { ActivityTab } from '@/components/console/tenant/ActivityTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'billing', label: 'Subscription' },
  { key: 'staff', label: 'Team' },
  { key: 'channels', label: 'Channels' },
  { key: 'rules', label: 'Assistant rules' },
  { key: 'audit', label: 'Activity' },
] as const;

const readWorkspace = cache(async (slug: string) => {
  const live = (await currentPlatformSessionOrNull()) !== null;
  return {
    live,
    workspace: live ? await getLiveWorkspaceDetail(slug) : await getWorkspaceDetail(slug),
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { workspace } = await readWorkspace((await params).id);
  return { title: workspace ? `${workspace.name} · Workspace` : 'Workspace' };
}

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const { workspace: w, live } = await readWorkspace(id);
  if (!w) notFound();
  const active = TABS.find((item) => item.key === tab)?.key ?? 'overview';
  const catalogue = active === 'billing' ? (live ? await getLivePlans() : await getPlans()) : null;
  const activity =
    active === 'audit'
      ? live
        ? ((await getLiveAuditEntries(w.id)) ?? [])
        : await getWorkspaceActivity(w.slug)
      : [];

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[{ label: 'Workspaces', href: '/platform/tenants' }, { label: w.name }]}
        title={w.name}
        actions={
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
        }
      />
      <div className="-mt-4 mb-7 flex flex-wrap items-center gap-x-5 gap-y-3">
        <StatusBadge
          tone={w.status === 'active' ? 'success' : w.status === 'past due' ? 'danger' : 'neutral'}
          dot
        >
          {w.status}
        </StatusBadge>
        <DataSource kind={live ? 'live' : 'designed'} />
        <p className="t-compact text-[var(--text-secondary)]">Created {w.since}</p>
        <details className="t-caption">
          <summary className="cursor-pointer text-[var(--text-secondary)]">
            Workspace reference
          </summary>
          <p className="mt-2 font-mono break-all">{w.id}</p>
        </details>
      </div>
      <nav aria-label="Workspace sections" className="console-tab-rail mb-8">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/platform/tenants/${w.slug}?tab=${item.key}`}
            scroll={false}
            aria-current={active === item.key ? 'page' : undefined}
            className="console-tab"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {active === 'overview' ? <OverviewTab w={w} /> : null}
      {active === 'billing' ? (
        <BillingTab
          w={w}
          plans={
            catalogue?.plans.map((plan) => ({
              code: plan.key,
              name: plan.name,
              requiresContract: plan.requiresContract ?? plan.key === 'custom',
            })) ?? []
          }
        />
      ) : null}
      {active === 'staff' ? (
        live ? (
          <RestrictedSection
            title="Workspace team"
            note={`${w.team.staff} active ${w.team.staff === '1' ? 'member' : 'members'} · ${w.team.admins} ${w.team.admins === '1' ? 'administrator' : 'administrators'}`}
          />
        ) : (
          <StaffTab w={w} staff={await getWorkspaceStaff(w.slug)} />
        )
      ) : null}
      {active === 'rules' ? (
        live ? (
          <RestrictedSection
            title="Assistant rules"
            note="Customer-specific instructions are available within a support session."
          />
        ) : (
          <RulesTab rules={await getWorkspaceRules(w.slug)} workspaceCount={PORTFOLIO_COUNT} />
        )
      ) : null}
      {active === 'channels' ? (
        live ? (
          <>
            <SectionHeading
              title="Channel connections"
              note="Messaging connections are planned for the next phase."
            />
            <Panel title="Channels are not connected yet">
              <div className="flex items-start gap-4 rounded-overlay bg-[var(--surface-raised)] p-5">
                <IconPlugConnected size={24} stroke={1.5} aria-hidden />
                <p className="t-body max-w-[64ch] text-[var(--text-secondary)]">
                  Delivery status, message counts and connection controls will appear when channel
                  processing is available.
                </p>
              </div>
            </Panel>
          </>
        ) : (
          <ChannelsTab channels={await getWorkspaceChannels(w.slug)} />
        )
      ) : null}
      {active === 'audit' ? <ActivityTab activity={activity} /> : null}
    </ConsolePage>
  );
}

function RestrictedSection({ title, note }: { title: string; note: string }) {
  return (
    <>
      <SectionHeading title={title} note={note} />
      <Panel title="Open a support session to continue">
        <div className="flex items-start gap-4 rounded-overlay bg-[var(--surface-raised)] p-5">
          <IconLock
            size={24}
            stroke={1.5}
            aria-hidden
            className="shrink-0 text-[var(--text-tertiary)]"
          />
          <div>
            <p className="t-body text-[var(--text-secondary)]">
              Use the support-session action above to enter this workspace with a recorded reason.
              Customer records are restricted to that visit.
            </p>
            <Link
              href="/platform/support-sessions"
              className="t-compact mt-4 inline-flex min-h-11 items-center text-[var(--text-action)] underline underline-offset-4"
            >
              Review support visits
            </Link>
          </div>
        </div>
      </Panel>
    </>
  );
}
