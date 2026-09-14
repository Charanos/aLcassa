'use client';

import { IconShieldCheck, IconAlertTriangle, IconClock, IconArrowRight, IconCode } from '@tabler/icons-react';

interface TrackerDashboardHeroProps {
  client: string;
  projectLead: string;
  briefVersion: string;
  briefDate: string;
  overallProgress: number;
  blockingCount: number;
  complianceCount: number;
  complianceNeedsYou: number;
  complianceTotal: number;
  builtCount: number;
  builtTotal: number;
}

export function TrackerDashboardHero({
  client,
  projectLead,
  briefVersion,
  briefDate,
  overallProgress,
  blockingCount,
  complianceCount,
  complianceNeedsYou,
  complianceTotal,
  builtCount,
  builtTotal,
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
          <p className="t-lede mt-3 text-[var(--text-secondary)]">
            The platform layer beneath a customer support inbox: tenancy with real database
            isolation, authentication, subscription structure, owner-level console, and
            machine-readable AI rules.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <a
            href="#status"
            className="t-compact inline-flex items-center gap-2 rounded-[12px] border border-transparent px-4 py-2 text-[var(--button-primary-fg)] shadow-sm transition-all hover:bg-[var(--blue-500)]"
            style={{
              background: 'var(--button-primary-bg)',
              minHeight: 'var(--control-md)',
            }}
          >
            Delivery Status <IconArrowRight size={15} />
          </a>
          <a
            href="#documents"
            className="t-compact inline-flex items-center rounded-[12px] px-4 py-2 text-[var(--text-primary)] transition-all hover:bg-[var(--surface-raised)]"
            style={{ boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)', background: 'white', minHeight: 'var(--control-md)' }}
          >
            Project Documents
          </a>
        </div>
      </div>

      {/* Telemetry Fact Block Grid */}
      <div className="mt-10 grid grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Prepared for</div>
          <div className="mt-1.5 text-[14px] font-medium text-[var(--text-primary)]">{client}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Project lead</div>
          <div className="mt-1.5 text-[14px] font-medium text-[var(--text-primary)]">{projectLead}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Against</div>
          <div className="mt-1.5 text-[14px] font-medium text-[var(--text-primary)]">Brief {briefVersion}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Issued</div>
          <div className="mt-1.5 text-[14px] font-medium text-[var(--text-primary)]">{briefDate}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Duration</div>
          <div className="mt-1.5 text-[14px] font-medium text-[var(--text-primary)]">9 working weeks</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Status</div>
          <div className="mt-1.5 text-[14px] font-medium text-[var(--amber-500)]">For Review</div>
        </div>
      </div>

      {/* Live Telemetry Gauges Card Row */}
      <div className="mt-8 grid grid-cols-1 gap-3 rounded-[24px] bg-[var(--surface-sunken)] p-2 sm:grid-cols-2 lg:grid-cols-4">
        {/* Progress Gauge */}
        <div
          className="rounded-[16px] px-6 py-5 transition-all"
          style={{
            background: 'white',
            boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Overall Progress</span>
            <span className="grid size-7 place-items-center rounded-lg bg-[var(--blue-50)] text-[var(--blue-600)]">
              <IconClock size={15} stroke={2} />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-light tracking-tight tabular-nums text-[var(--text-primary)]">{overallProgress}%</span>
            <span className="text-[12px] font-medium text-[var(--green-500)]">Milestone 1 Active</span>
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-base)]">
            <div
              className="h-full bg-[var(--blue-500)] transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Blocking Decisions */}
        <div
          className="rounded-[16px] px-6 py-5 transition-all"
          style={{
            background: 'white',
            boxShadow:
              blockingCount > 0
                ? '-3px -3px 12px color-mix(in oklab, var(--amber-500) 8%, transparent), 4px 5px 18px color-mix(in oklab, var(--amber-500) 8%, transparent), 0 0 0 1px color-mix(in oklab, var(--amber-500) 30%, var(--border-subtle) 70%), var(--shadow-sm)'
                : 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Blocking Decisions</span>
            <span className="grid size-7 place-items-center rounded-lg bg-[var(--amber-50)] text-[var(--amber-600)]">
              <IconAlertTriangle size={15} stroke={2} />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-light tracking-tight tabular-nums text-[var(--amber-500)]">{blockingCount}</span>
            <span className="text-[12px] font-medium text-[var(--amber-600)]">M4a Decision Gate</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {blockingCount > 0
              ? 'Whether full support-mode access extends to customer records requires client signoff.'
              : 'No blocking decisions outstanding.'}
          </p>
        </div>

        {/* Built & Verifiable Gauge */}
        <div
          className="rounded-[16px] px-6 py-5 transition-all"
          style={{
            background: 'white',
            boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Built & Verifiable</span>
            <span className="grid size-7 place-items-center rounded-lg bg-[var(--ink-50)] text-[var(--ink-600)]">
              <IconCode size={15} stroke={2} />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-light tracking-tight tabular-nums text-[var(--text-primary)]">
              {builtCount} <span className="text-[20px] text-[var(--text-tertiary)]">/ {builtTotal}</span>
            </span>
            <span className="text-[12px] font-medium text-[var(--text-tertiary)]">Foundation</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Openable and executable in the repository right now.
          </p>
        </div>

        {/* Compliance Meter */}
        <div
          className="rounded-[16px] px-6 py-5 transition-all"
          style={{
            background: 'white',
            boxShadow: complianceNeedsYou > 0
              ? '-3px -3px 12px color-mix(in oklab, var(--red-500) 8%, transparent), 4px 5px 18px color-mix(in oklab, var(--red-500) 8%, transparent), 0 0 0 1px color-mix(in oklab, var(--red-500) 30%, var(--border-subtle) 70%), var(--shadow-sm)'
              : 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Compliance Obligations</span>
            <span 
              className="grid size-7 place-items-center rounded-lg"
              style={{
                background: complianceNeedsYou > 0 ? 'var(--red-50)' : 'var(--green-50)',
                color: complianceNeedsYou > 0 ? 'var(--red-600)' : 'var(--green-600)',
              }}
            >
              <IconShieldCheck size={15} stroke={2} />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span 
              className="text-4xl font-light tracking-tight tabular-nums"
              style={{ color: complianceNeedsYou > 0 ? 'var(--red-500)' : 'var(--green-500)' }}
            >
              {complianceCount} <span className="text-[20px] text-[var(--text-tertiary)]">/ {complianceTotal}</span>
            </span>
            <span className="text-[12px] font-medium text-[var(--text-tertiary)]">Met</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {complianceNeedsYou > 0
              ? `${complianceNeedsYou} item(s) currently require a decision from you.`
              : 'Data isolation policy verified by automated test suite.'}
          </p>
        </div>
      </div>
    </div>
  );
}
