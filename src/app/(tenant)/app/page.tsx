import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from '@/components/structure/NavigationLink';
import { DashboardHero } from '@/components/tenant/DashboardHero';
import { ChannelsPanel, MetersPanel, QueuePanel } from '@/components/tenant/OverviewPanels';
import { Reveal } from '@/components/tenant/Reveal';
import { SetupChecklist } from '@/components/tenant/SetupChecklist';
import { VolumeChart, VolumeLegend } from '@/components/tenant/VolumeChart';
import { ONBOARDING_DISMISSED_COOKIE } from '@/lib/tenant/onboarding';
import { getOverview } from '@/lib/tenant/data';

export const metadata: Metadata = { title: 'Overview' };

/** Keep onboarding above routine activity and hide the checklist once setup is complete. */
export default async function OverviewPage() {
  const [m, jar] = await Promise.all([getOverview(), cookies()]);

  /* Completion hides the checklist permanently; dismissal is a reversible browser preference. */
  const complete = m.checklist.every((step) => step.done);
  const dismissed = jar.get(ONBOARDING_DISMISSED_COOKIE)?.value === '1';

  return (
    <Reveal>
      <p className="t-caption text-[var(--text-secondary)]">
        Overview preview. Names, conversation figures, channel status and setup progress below are
        examples; they do not describe your workspace. Open Settings or Activity for recorded
        workspace information.
      </p>
      <DashboardHero
        operatorFirstName={m.operatorFirstName}
        planName={m.planName}
        today={m.today}
        summary={m.summary}
        stats={m.stats}
      />

      {complete || dismissed ? null : <SetupChecklist steps={m.checklist} />}

      <section
        data-reveal
        data-slot="panel"
        aria-labelledby="volume-heading"
        className="overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
        style={{ boxShadow: 'var(--glass-highlight), var(--shadow-sm)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 pt-[15px] pb-[13px]">
          <h2
            id="volume-heading"
            className="t-eyebrow uppercase"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Conversation volume · 30 days
          </h2>
          <VolumeLegend />
        </div>
        <div className="px-5 pt-[18px] pb-5">
          <VolumeChart data={m.volume} />
        </div>
      </section>

      <div
        data-reveal
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.95fr)]"
      >
        <QueuePanel items={m.queue} total={m.queueTotal} />

        <div className="grid gap-4">
          <ChannelsPanel channels={m.channelStatus} />
          <MetersPanel meters={m.meters} />
        </div>
      </div>

      <section
        data-reveal
        data-slot="panel"
        aria-labelledby="activity-heading"
        className="rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 md:p-8"
        style={{ boxShadow: 'var(--glass-highlight), var(--shadow-sm)' }}
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
    </Reveal>
  );
}
