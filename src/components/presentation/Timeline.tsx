import {
  IconAlertTriangle,
  IconCircleCheck,
  IconMinus,
  IconProgress,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { StatusChip, type Tone } from './Sheet';
import type { MilestoneStatus } from '@/lib/presentation/engagement';

/**
 * The milestone timeline.
 *
 * The spine down the left is the drafting-sheet gesture: a dimension line whose
 * terminators are the gates. A gate is a demonstrated behaviour shown running,
 * not a status report, so each entry names what will be demonstrated rather
 * than only a percentage.
 *
 * State is carried by the chip on the title line, never by a border on the
 * card. The progress figure is a judgement rather than a computed number and
 * the section copy says so, because a percentage derived from a task count
 * would look more precise and mean less.
 */

type Milestone = {
  id: string;
  name: string;
  week: string;
  lands: string;
  gate: string;
  tranche: number | null;
  status: MilestoneStatus;
  progress: number;
  note: string;
};

export const MILESTONE_STATUS: Record<
  MilestoneStatus,
  { icon: TablerIcon; tone: Tone; label: string }
> = {
  complete: { icon: IconCircleCheck, tone: 'verdigris', label: 'Complete' },
  active: { icon: IconProgress, tone: 'copper', label: 'In flight' },
  blocked: { icon: IconAlertTriangle, tone: 'ochre', label: 'Blocked' },
  upcoming: { icon: IconMinus, tone: 'graphite', label: 'Not started' },
};

export function Timeline({ milestones }: { milestones: readonly Milestone[] }) {
  return (
    <div
      className="overflow-hidden rounded-[24px]"
      style={{
        background: 'white',
        boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
      }}
      data-reveal-group
    >
      <ol className="flex flex-col">
        {milestones.map((milestone) => {
          const status = MILESTONE_STATUS[milestone.status];

          return (
            <li
              key={milestone.id}
              data-reveal
              className="grid gap-4 border-b p-6 last:border-b-0 md:grid-cols-[200px_1fr] md:gap-8 lg:grid-cols-[240px_1fr]"
              style={{ borderColor: 'var(--ink-100)' }}
            >
              {/* Left Column: Metadata */}
              <div className="flex flex-col items-start gap-3 md:pt-0.5">
                <span className="t-data text-[var(--text-tertiary)]">Week {milestone.week}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={status.tone} icon={status.icon} size="sm">
                    {status.label}
                  </StatusChip>
                  <span
                    className="t-data text-[13px]"
                    style={{ color: `var(--${status.tone}-ink)` }}
                  >
                    {milestone.id}
                  </span>
                </div>
              </div>

              {/* Right Column: Content */}
              <div>
                <h3 className="t-panel text-[var(--text-primary)]">{milestone.name}</h3>

                <p className="t-compact mt-2.5 leading-relaxed text-[var(--text-secondary)]">
                  {milestone.lands}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-chip"
                    role="progressbar"
                    aria-valuenow={milestone.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${milestone.name} progress`}
                    style={{ background: 'var(--surface-sunken)' }}
                  >
                    <span
                      data-progress-bar
                      data-value={milestone.progress}
                      className="block h-full rounded-chip transition-all duration-500"
                      style={{
                        width: `${milestone.progress}%`,
                        background: `var(--${status.tone}-ink)`,
                      }}
                    />
                  </div>
                  <span
                    className="t-data shrink-0 text-[var(--text-secondary)] tabular-nums"
                    style={{ fontSize: '12px' }}
                  >
                    {milestone.progress}%
                  </span>
                </div>

                {milestone.note ? (
                  <p className="t-caption mt-4 leading-relaxed text-[var(--text-tertiary)]">
                    {milestone.note}
                  </p>
                ) : null}

                <div
                  className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4"
                  style={{ borderColor: 'var(--ink-100)' }}
                >
                  <span className="t-eyebrow text-[var(--text-tertiary)]">Gate</span>
                  <span className="t-compact text-[var(--text-primary)]">{milestone.gate}</span>
                  {milestone.tranche ? (
                    <span className="t-eyebrow ml-auto text-[var(--text-tertiary)]">
                      Releases tranche {milestone.tranche}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
