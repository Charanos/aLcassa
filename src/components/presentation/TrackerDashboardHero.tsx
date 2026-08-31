'use client';

import { IconShieldCheck, IconAlertTriangle, IconClock, IconArrowRight } from '@tabler/icons-react';

interface TrackerDashboardHeroProps {
  client: string;
  projectLead: string;
  briefVersion: string;
  briefDate: string;
  overallProgress: number;
  blockingCount: number;
  complianceCount: number;
}

export function TrackerDashboardHero({
  client,
  projectLead,
  briefVersion,
  briefDate,
  overallProgress,
  blockingCount,
  complianceCount,
}: TrackerDashboardHeroProps) {
  return (
    <div id="top" className="pt-10 md:pt-14">
      {/* Eyebrow & Title */}
      <div className="flex items-center gap-3">
        <span aria-hidden className="block h-px w-8" style={{ background: 'var(--blue-200)' }} />
        <p className="t-eyebrow text-[var(--blue-500)]">
          Andishi Â· Platform Foundation Â· Phase 1
        </p>
      </div>

      <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="t-display text-4xl font-normal text-[var(--text-primary)] md:text-5xl">
            aLcassa Delivery Tracker
          </h1>
          <p
            className="t-lede mt-3 text-[var(--text-secondary)]"
            style={{ maxWidth: 'var(--measure-prose)' }}
          >
            The platform layer beneath a customer support inbox: tenancy with real database
            isolation, authentication, subscription structure, owner-level console, and
            machine-readable AI rules.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <a
            href="#status"
            className="t-compact inline-flex items-center gap-2 rounded-chip border px-4 py-2 text-[var(--button-primary-fg)] transition-colors hover:bg-[var(--blue-500)]"
            style={{
              background: 'var(--button-primary-bg)',
              borderColor: 'var(--blue-600)',
              minHeight: 'var(--control-md)',
            }}
          >
            Delivery Status <IconArrowRight size={15} />
          </a>
          <a
            href="#documents"
            className="t-compact inline-flex items-center rounded-chip border px-4 py-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
            style={{ borderColor: 'var(--border-subtle)', minHeight: 'var(--control-md)' }}
          >
            Project Documents
          </a>
        </div>
      </div>

      {/* Telemetry Fact Block Grid */}
      <div
        className="mt-8 grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-3 lg:grid-cols-6"
        style={{ borderColor: 'var(--ink-100)' }}
      >
        <div>
          <div className="t-eyebrow text-[var(--text-tertiary)]">Prepared for</div>
          <div className="t-data mt-1 text-[var(--text-primary)]">{client}</div>
        </div>
        <div>
          <div className="t-eyebrow text-[var(--text-tertiary)]">Project lead</div>
          <div className="t-data mt-1 text-[var(--text-primary)]">{projectLead}</div>
        </div>
        <div>
          <div className="t-eyebrow text-[var(--text-tertiary)]">Against</div>
          <div className="t-data mt-1 text-[var(--text-primary)]">Brief {briefVersion}</div>
        </div>
        <div>
          <div className="t-eyebrow text-[var(--text-tertiary)]">Issued</div>
          <div className="t-data mt-1 text-[var(--text-primary)]">{briefDate}</div>
        </div>
        <div>
          <div className="t-eyebrow text-[var(--text-tertiary)]">Duration</div>
          <div className="t-data mt-1 text-[var(--text-primary)]">9 working weeks</div>
        </div>
        <div>
          <div className="t-eyebrow text-[var(--text-tertiary)]">Status</div>
          <div className="t-data mt-1 text-[var(--amber-500)]">For Review</div>
        </div>
      </div>

      {/* Live Telemetry Gauges Card Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {/* Progress Gauge */}
        <div
          className="rounded-panel border p-5 transition-all"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--ink-100)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="t-eyebrow text-[var(--text-tertiary)]">Overall Progress</span>
            <IconClock size={16} className="text-[var(--blue-500)]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="t-display text-3xl text-[var(--text-primary)]">{overallProgress}%</span>
            <span className="t-caption text-[var(--green-500)]">Milestone 1 Active</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
            <div
              className="h-full bg-[var(--blue-500)] transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/*
          Blocking decisions.

          ⚠ THE FULL OCHRE FILL IS GONE. 03 §20 lists "coloured backgrounds on
          whole panels to signal state" as an anti-pattern, and the reason is
          visible on this row: one solid tinted card beside two plain ones
          reads as an alarm rather than as a count, and it pulls the eye away
          from the progress figure that is arguably the more important number.

          It now uses the same COLOURED NEUMORPHIC treatment as every other
          toned panel in the system (15-D9): the card keeps the standard
          surface, and its ambient shadow is mixed from the hue instead of
          neutral graphite, so it glows faintly the colour of its own state.
          The count itself is already ochre and the glyph is already a warning
          triangle, so the state is named twice before the glow is read at all.
        */}
        <div
          className="rounded-panel border p-5 transition-all"
          style={{
            background: 'var(--surface-raised)',
            borderColor:
              blockingCount > 0
                ? 'color-mix(in oklab, color-mix(in oklab, var(--amber-500) 38%, var(--surface-base)) 45%, var(--ink-100) 55%)'
                : 'var(--ink-100)',
            boxShadow:
              blockingCount > 0
                ? '-3px -3px 12px color-mix(in oklab, var(--amber-500) 8%, transparent), 4px 5px 18px color-mix(in oklab, var(--amber-500) 8%, transparent), var(--shadow-card)'
                : 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="t-eyebrow text-[var(--text-tertiary)]">Blocking Decisions</span>
            <IconAlertTriangle size={16} className="text-[var(--amber-500)]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="t-display text-3xl text-[var(--amber-500)]">{blockingCount}</span>
            <span className="t-caption text-[var(--amber-500)]">M4a Decision Gate</span>
          </div>
          <p className="t-caption mt-2 text-[var(--text-secondary)]">
            {blockingCount > 0
              ? 'Whether full support-mode access extends to customer records requires client signoff.'
              : 'No blocking decisions outstanding.'}
          </p>
        </div>

        {/* Compliance Meter */}
        <div
          className="rounded-panel border p-5 transition-all"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--ink-100)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="t-eyebrow text-[var(--text-tertiary)]">Compliance Obligations</span>
            <IconShieldCheck size={16} className="text-[var(--green-500)]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="t-display text-3xl text-[var(--green-500)]">
              {complianceCount} Met
            </span>
            <span className="t-caption text-[var(--text-tertiary)]">Database Enforced</span>
          </div>
          <p className="t-caption mt-2 text-[var(--text-secondary)]">
            Data isolation policy verified by automated test suite.
          </p>
        </div>
      </div>
    </div>
  );
}
