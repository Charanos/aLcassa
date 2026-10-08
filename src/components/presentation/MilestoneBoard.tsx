import { IconCheck, IconClock, IconLoader, IconLock } from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';
import Link from 'next/link';
import {
  MILESTONES,
  MILESTONE_PROGRESS_REVIEW,
  type MilestoneStatus,
} from '@/lib/presentation/engagement';
import { IconTile } from '@/components/primitives/IconTile';

/** Milestone state, engineering estimate and the evidence behind each reassessment. */

const TONE: Record<
  MilestoneStatus,
  { icon: TablerIcon; label: string; ink: string; tile: 'success' | 'info' | 'warning' | 'neutral' }
> = {
  complete: { icon: IconCheck, label: 'Complete', ink: 'var(--success-fg)', tile: 'success' },
  active: { icon: IconLoader, label: 'In progress', ink: 'var(--blue-600)', tile: 'info' },
  blocked: { icon: IconLock, label: 'Blocked', ink: 'var(--danger-fg)', tile: 'warning' },
  upcoming: { icon: IconClock, label: 'Not started', ink: 'var(--text-tertiary)', tile: 'neutral' },
};

export function MilestoneBoard() {
  const done = MILESTONES.filter((m) => m.status === 'complete').length;

  return (
    <div className="grid gap-4">
      <p className="t-body" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}>
        {done} of {MILESTONES.length} milestones complete. Each one ends in a demonstration rather
        than a document, so &ldquo;done&rdquo; means you have seen it work.
      </p>

      <ol className="grid gap-3">
        {MILESTONES.map((m) => {
          const tone = TONE[m.status];
          const review = MILESTONE_PROGRESS_REVIEW[m.id];
          return (
            <li
              key={m.id}
              className="rounded-overlay p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-md)]"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="flex items-start gap-4">
                <IconTile icon={tone.icon} tone={tone.tile} size="lg" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3
                      className="text-md"
                      style={{
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {m.name}
                    </h3>
                    <span
                      style={{
                        font: '500 var(--type-compact)/1 var(--font-mono)',
                        color: tone.ink,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {tone.label}
                    </span>
                    <span
                      className="ml-auto whitespace-nowrap"
                      style={{
                        font: '400 var(--type-compact)/1 var(--font-mono)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      Week {m.week}
                    </span>
                  </div>

                  <p
                    className="t-compact mt-2"
                    style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
                  >
                    {m.note}
                  </p>

                  {m.status === 'active' ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full"
                        style={{ background: 'var(--surface-inset)' }}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={m.progress}
                        aria-label={`${m.name} estimated implementation progress`}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${m.progress}%`, background: 'var(--blue-500)' }}
                        />
                      </div>
                      <span
                        className="numeric shrink-0"
                        style={{
                          font: '500 var(--type-compact)/1 var(--font-mono)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {m.progress}%
                      </span>
                    </div>
                  ) : null}
                  {review ? (
                    <p className="t-compact mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--text-secondary)]">
                      <span>
                        Reassessed {review.previous}% → {m.progress}% · 8 October
                      </span>
                      <Link
                        href={`/project-tracker/verification#milestone-${m.id}`}
                        className="text-[var(--text-action)] underline underline-offset-4"
                      >
                        Evidence and remaining work
                      </Link>
                    </p>
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
