import { IconCheck, IconClock, IconLoader, IconLock } from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';
import { MILESTONES, type MilestoneStatus } from '@/lib/presentation/engagement';
import { IconTile } from '@/components/primitives/IconTile';

/**
 * WHERE THE PROJECT IS. The one thing a client opens this page to find out.
 *
 * ⚠ IT REPLACES A TIMELINE THAT EXPLAINED THE ENGINEERING RATHER THAN THE
 * PROJECT.
 *
 * The milestone notes used to run to two hundred words each about policy
 * catalogues, ordered state pairs and adapter seams. Every word was true and
 * none of it answered the question the reader arrived with, which is: what
 * works, what is left, and is anything stuck. The notes are now four sentences
 * of plain English and the engineering detail lives in the documents, where
 * somebody who wants it will go looking.
 *
 * ⚠ THE STATUS IS THE LOUDEST THING ON EACH CARD, because it is the only part
 * most readers will take in. Progress bars are deliberately secondary: a
 * percentage invites an argument about whether 80 is really 80, where "complete"
 * and "in progress" do not.
 */

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
                      className="text-[16px]"
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
                        font: '500 12px/1 var(--font-mono)',
                        color: tone.ink,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {tone.label}
                    </span>
                    <span
                      className="ml-auto whitespace-nowrap"
                      style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
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

                  {/*
                    ⚠ THE BAR IS ONLY DRAWN WHERE IT MEANS SOMETHING. On a
                    complete milestone it is a full bar saying what the word
                    beside it already said, and on one not started it is an empty
                    trough. Both are decoration; only a part-finished milestone
                    has a figure worth a shape.
                  */}
                  {m.status === 'active' ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full"
                        style={{ background: 'var(--surface-inset)' }}
                        role="img"
                        aria-label={`${m.name} is about ${m.progress}% done`}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${m.progress}%`, background: 'var(--blue-500)' }}
                        />
                      </div>
                      <span
                        className="numeric shrink-0"
                        style={{
                          font: '500 12px/1 var(--font-mono)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {m.progress}%
                      </span>
                    </div>
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
