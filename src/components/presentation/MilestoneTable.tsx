import Link from 'next/link';
import { IconArrowUpRight, IconCheck } from '@tabler/icons-react';
import {
  MILESTONES,
  MILESTONE_PROGRESS_REVIEW,
  PHASE_ONE_VERIFICATION,
  type MilestoneStatus,
} from '@/lib/presentation/engagement';

const STATES: Record<MilestoneStatus, { label: string; color: string }> = {
  complete: { label: 'Accepted', color: 'var(--success-fg)' },
  active: { label: 'In progress', color: 'var(--text-action)' },
  blocked: { label: 'Blocked', color: 'var(--danger-fg)' },
  upcoming: { label: 'Planned', color: 'var(--text-tertiary)' },
};

/** One source for estimated engineering progress and separate acceptance gates. */
export function MilestoneTable() {
  return (
    <div className="overflow-hidden rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-4 sm:px-6">
        <p className="t-compact font-medium">Phase One delivery</p>
        <p className="t-caption text-[var(--text-secondary)]">
          Reviewed {PHASE_ONE_VERIFICATION.date}
        </p>
      </div>
      <table className="w-full table-fixed text-left">
        <caption className="sr-only">
          Phase One milestones. Percentages estimate engineering progress; acceptance is tracked
          separately. A 100% estimate does not close an outstanding demonstration or review.
        </caption>
        <thead className="t-caption text-[var(--text-tertiary)]">
          <tr className="border-b border-[var(--border-subtle)]">
            <th scope="col" className="w-[70%] px-4 py-3 font-medium sm:w-[32%] sm:px-6">
              Milestone
            </th>
            <th scope="col" className="w-[30%] px-4 py-3 font-medium sm:w-[18%]">
              Progress
            </th>
            <th scope="col" className="hidden w-[18%] px-4 py-3 font-medium sm:table-cell">
              Acceptance
            </th>
            <th scope="col" className="hidden w-[32%] px-6 py-3 font-medium sm:table-cell">
              Completion gate
            </th>
          </tr>
        </thead>
        <tbody>
          {MILESTONES.map((milestone) => {
            const state = STATES[milestone.status];
            const stateLabel =
              milestone.status === 'active' && milestone.progress === 100
                ? 'Demo pending'
                : state.label;
            const review = MILESTONE_PROGRESS_REVIEW[milestone.id];
            return (
              <tr
                key={milestone.id}
                className="border-b border-[var(--border-subtle)] align-top transition-colors last:border-b-0 hover:bg-[var(--surface-sunken)] motion-reduce:transition-none"
              >
                <th scope="row" className="px-4 py-5 font-normal sm:px-6">
                  <span className="t-data mb-1 block text-[var(--text-tertiary)]">
                    {milestone.id} · Week {milestone.week}
                  </span>
                  <span className="t-compact block font-medium">{milestone.name}</span>
                  <span className="t-caption mt-2 block sm:hidden" style={{ color: state.color }}>
                    {stateLabel}
                  </span>
                  <span className="t-caption mt-1 block text-[var(--text-secondary)] sm:hidden">
                    {milestone.gate}
                  </span>
                </th>
                <td className="px-4 py-5">
                  <span className="t-compact numeric block font-medium">{milestone.progress}%</span>
                  <div
                    role="progressbar"
                    aria-label={`${milestone.name} estimated engineering progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={milestone.progress}
                    className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--surface-inset)]"
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${milestone.progress}%`,
                        background:
                          milestone.status === 'complete'
                            ? 'var(--success-fg)'
                            : 'var(--text-action)',
                      }}
                    />
                  </div>
                  {review && (
                    <Link
                      href={`/project-tracker/verification#milestone-${milestone.id}`}
                      aria-label={`${milestone.name}: evidence and remaining work`}
                      className="t-caption mt-3 inline-flex items-center gap-1 text-[var(--text-action)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--border-focus)]"
                    >
                      Review
                      <IconArrowUpRight size={12} aria-hidden />
                    </Link>
                  )}
                </td>
                <td className="hidden px-4 py-5 sm:table-cell">
                  <span
                    className="t-compact inline-flex items-center gap-1.5"
                    style={{ color: state.color }}
                  >
                    {milestone.status === 'complete' && <IconCheck size={14} aria-hidden />}
                    {stateLabel}
                  </span>
                </td>
                <td className="hidden px-6 py-5 sm:table-cell">
                  <p className="t-compact text-[var(--text-secondary)]">{milestone.gate}</p>
                  {milestone.status === 'active' && milestone.progress === 100 && (
                    <p className="t-caption mt-1.5 text-[var(--text-tertiary)]">
                      Engineering ready · demonstration pending
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="t-caption border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-4 text-[var(--text-secondary)] sm:px-6">
        Engineering estimates reflect implemented and verified work. Acceptance includes the
        milestone demonstration and outstanding reviews.
      </p>
    </div>
  );
}
