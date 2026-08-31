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
    <ol className="relative grid gap-3" data-reveal-group>
      {/* The spine, hidden below md where the layout collapses and it would be
          a stray vertical line beside nothing. */}
      <span
        aria-hidden
        className="absolute top-6 bottom-6 left-[7px] hidden w-px md:block"
        style={{ background: 'var(--border-subtle)' }}
      />

      {milestones.map((milestone) => {
        const status = MILESTONE_STATUS[milestone.status];

        return (
          <li key={milestone.id} data-reveal className="relative md:pl-9">
            <span
              aria-hidden
              className="absolute top-7 left-0 hidden size-[15px] rounded-full border-2 md:block"
              style={{
                background:
                  milestone.status === 'upcoming'
                    ? 'var(--surface-base)'
                    : `var(--${status.tone}-tint)`,
                borderColor: `var(--${status.tone}-rule)`,
              }}
            />

            <article
              className="rounded-panel border p-5 transition-[border-color,transform] duration-[var(--motion-fade)] hover:-translate-y-px hover:border-[var(--border-strong)]"
              style={{
                background: 'var(--surface-raised)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <span className="t-data" style={{ color: `var(--${status.tone}-ink)` }}>
                  {milestone.id}
                </span>
                <h3 className="t-panel text-[var(--text-primary)]">{milestone.name}</h3>
                <StatusChip tone={status.tone} icon={status.icon}>
                  {status.label}
                </StatusChip>
                <span className="t-eyebrow ml-auto text-[var(--text-tertiary)]">
                  week {milestone.week}
                </span>
              </div>

              <p
                className="t-compact mt-2 text-[var(--text-secondary)]"
                style={{ maxWidth: 'var(--measure-prose)' }}
              >
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
                    className="block h-full rounded-chip"
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

              <p className="t-caption mt-3 text-[var(--text-tertiary)]">{milestone.note}</p>

              <div
                className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3"
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
            </article>
          </li>
        );
      })}
    </ol>
  );
}
