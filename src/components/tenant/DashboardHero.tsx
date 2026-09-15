import Link from 'next/link';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';
import { Sparkline } from '@/components/tenant/Sparkline';
import type { OverviewStat } from '@/lib/tenant/data';

/**
 * The overview's masthead: who is reading, what happened since they last
 * looked, and the four numbers that decide whether they need to do anything.
 *
 * ⚠ THIS IS A SERVER COMPONENT, AND THE PREVIOUS VERSION DID NOT NEED TO BE A
 * CLIENT ONE EITHER. It carried `'use client'` for a GSAP entrance and a
 * Recharts area chart drawing SEVEN HARDCODED POINTS of `Mon…Sun` invented in
 * the component file. The entrance moved to `Reveal`, the real series moved
 * behind `getOverview`, and the sparklines are static SVG — so the whole
 * masthead now renders on the server and ships no JavaScript at all.
 *
 * ⚠ THE DELTA PILL TAKES ITS COLOUR FROM `tone`, NEVER FROM `dir`. A median
 * reply time falling eighteen seconds is an arrow DOWN and a green pill; a
 * satisfaction score falling a tenth is also down and an ochre one. The arrow
 * reports the movement, the colour reports whether the movement is welcome,
 * and the two are separate fields on the read model precisely because they
 * come apart. See `OverviewStat`.
 */

export type DashboardHeroProps = {
  operatorFirstName: string;
  planName: string;
  today: string;
  summary: string;
  stats: OverviewStat[];
};

/* 03 §14. Ochre resolves, and every one of these readings is something the
   reader can act on — so `warn` is the worst tone a headline number carries.
   A stat tile never goes oxide; a refusal the reader cannot act on is not a
   metric, it is an incident, and it belongs in the boundary frame. */
const TONES = {
  good: { ink: 'var(--success-fg)', tint: 'var(--success-bg)' },
  warn: { ink: 'var(--warning-fg)', tint: 'var(--warning-bg)' },
} as const;

function StatTile({ stat }: { stat: OverviewStat }) {
  const tone = TONES[stat.tone];
  const Arrow = stat.dir === 'up' ? IconArrowUpRight : IconArrowDownRight;

  return (
    <div
      data-slot="panel"
      className="rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-[18px] pt-4 pb-[15px]"
      style={{ boxShadow: 'var(--glass-highlight), var(--shadow-sm)' }}
    >
      <p className="t-eyebrow uppercase" style={{ color: 'var(--text-tertiary)' }}>
        {stat.label}
      </p>

      <p className="mt-2.5 flex items-baseline gap-2.5">
        <span
          className="tabular-nums"
          style={{
            font: 'var(--t-title)',
            letterSpacing: 'var(--t-title-tracking)',
            color: 'var(--text-primary)',
          }}
        >
          {stat.value}
        </span>
        <span
          className="t-micro inline-flex h-5 items-center gap-1 rounded-full pr-[7px] pl-[5px]"
          style={{ background: tone.tint, color: tone.ink }}
        >
          <Arrow size={13} stroke={1.8} aria-hidden />
          {stat.delta}
        </span>
      </p>

      <div className="mt-3 h-[26px]">
        <Sparkline series={stat.series} stroke={tone.ink} />
      </div>

      <p className="t-compact mt-2.5" style={{ color: 'var(--text-secondary)' }}>
        {stat.note}
      </p>
    </div>
  );
}

export function DashboardHero({
  operatorFirstName,
  planName,
  today,
  summary,
  stats,
}: DashboardHeroProps) {
  return (
    <div className="grid gap-5">
      <div data-reveal className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="t-eyebrow uppercase" style={{ color: 'var(--text-tertiary)' }}>
            {today}
          </p>
          <h1 className="t-display mt-2" style={{ color: 'var(--text-primary)' }}>
            Good to see you, {operatorFirstName}
          </h1>
          <p
            className="t-body mt-2.5 max-w-[62ch] text-pretty"
            style={{ color: 'var(--text-secondary)' }}
          >
            {summary}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Real routes only. The design's "Open reports" points at a screen
              this build does not have; sending a reader to a 404 to honour a
              mockup is not fidelity. Plan and usage is the nearest surface
              that actually exists, and it is where the meters below link too. */}
          <Button asChild variant="secondary" size="md">
            <Link href="/app/settings/subscription">Plan and usage</Link>
          </Button>
          <Button asChild variant="primary" size="md">
            <Link href="/app/inbox">Go to inbox</Link>
          </Button>
        </div>
      </div>

      <div
        data-reveal
        className="grid gap-3.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(212px, 1fr))' }}
      >
        {stats.map((stat) => (
          <StatTile key={stat.key} stat={stat} />
        ))}
      </div>

      <span className="sr-only">You are on the {planName} plan.</span>
    </div>
  );
}
