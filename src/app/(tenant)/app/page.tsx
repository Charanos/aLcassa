import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { DashboardHero } from '@/components/tenant/DashboardHero';
import { ChannelsPanel, MetersPanel, QueuePanel } from '@/components/tenant/OverviewPanels';
import { Reveal } from '@/components/tenant/Reveal';
import { SetupChecklist } from '@/components/tenant/SetupChecklist';
import { VolumeChart, VolumeLegend } from '@/components/tenant/VolumeChart';
import { ONBOARDING_DISMISSED_COOKIE } from '@/lib/tenant/onboarding';
import { getOverview } from '@/lib/tenant/data';

export const metadata: Metadata = { title: 'Overview' };

/**
 * 02 §4. The tenant overview: what needs a person, what the assistant is
 * absorbing, what the plan has left, and — until it is finished — the setup
 * checklist.
 *
 * ⚠ THE SETUP CHECKLIST IS THE HIGHEST-VALUE FOUR HOURS IN THE TENANT
 * APPLICATION. A B2B owner's entire first impression is whether they knew
 * what to do next, and this audience will use the product for twenty
 * minutes in week one and five minutes a month afterwards.
 *
 * It disappears PERMANENTLY once complete and it never reappears. A
 * checklist that comes back is a nag. Copy from 10 §4.
 *
 * ⚠ THE CHECKLIST SITS ABOVE THE MEASUREMENTS WHILE IT IS UNFINISHED, AND
 * THE ORDER IS THE POINT. A workspace mid-setup has nothing worth measuring
 * — its numbers are noise from a half-connected product — so the checklist
 * takes the position directly under the masthead and pushes the panels down.
 * Once it is done it vanishes and the measurements close the gap. The design
 * does not show this section at all; it draws the finished, steady state.
 */
export default async function OverviewPage() {
  const [m, jar] = await Promise.all([getOverview(), cookies()]);

  /* Two independent reasons the checklist does not render, and they are not
     the same thing. `complete` is the permanent disappearance the section's
     rule describes. `dismissed` is the reader asking for their overview back
     — see the dismiss handler for why it is a cookie and what that costs. */
  const complete = m.checklist.every((step) => step.done);
  const dismissed = jar.get(ONBOARDING_DISMISSED_COOKIE)?.value === '1';

  return (
    <Reveal>
      <DashboardHero
        operatorFirstName={m.operatorFirstName}
        planName={m.planName}
        today={m.today}
        summary={m.summary}
        stats={m.stats}
      />

      {/* ── Setup checklist ──────────────────────────────────────────── */}
      {complete || dismissed ? null : <SetupChecklist steps={m.checklist} />}

      {/* ── Conversation volume ──────────────────────────────────────── */}
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

      {/* ── Queue, channels, meters ──────────────────────────────────── */}
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

      {/* ── Recent activity ──────────────────────────────────────────── */}
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
