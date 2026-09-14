import { IconCheck } from '@tabler/icons-react';

/**
 * The onboarding pathway, drawn beside the form that starts it.
 *
 * ⚠ THE PROBLEM THIS SOLVES IS EXPECTATION, NOT NAVIGATION. Nothing here is
 * clickable and nothing here is a control. Someone filling in a registration
 * form has no idea whether they are one screen from a working workspace or
 * eleven, and a B2B owner deciding whether to start now or "come back when I
 * have time" is making that decision on a guess. Showing the whole path —
 * four steps, ten minutes, stop whenever you like — replaces the guess. It is
 * the cheapest conversion mechanic available on this screen and it costs no
 * interactivity, no client bundle and no state.
 *
 * ⚠ IT IS THE SAME PATH THE OVERVIEW'S CHECKLIST FINISHES. Steps three and
 * four are literally the first two rows of `getOverview().checklist`, in the
 * order that list now uses. Somebody who reads this rail on the sign-up page
 * and then lands on the overview should recognise where they are; two
 * different accounts of "what setup means" would be worse than neither.
 *
 * ⚠ WHAT IT DOES NOT PROMISE. No duration per step, no completion percentage,
 * and no "you're almost there" — the system does not measure any of those
 * during registration, and inventing them is how an onboarding rail becomes
 * the thing people learn to ignore.
 */

export type JourneyStage = 'create' | 'confirm' | 'rules' | 'team';

const STAGES: { key: JourneyStage; title: string; blurb: string }[] = [
  {
    key: 'create',
    title: 'Create your workspace',
    blurb: 'Name it, and set the password you will sign in with.',
  },
  {
    key: 'confirm',
    title: 'Confirm your email',
    blurb: 'So we can reach you about the workspace. You can do this later.',
  },
  {
    key: 'rules',
    title: 'Tell the assistant how to answer',
    blurb: 'Your tone, your limits, and what must always reach a person.',
  },
  {
    key: 'team',
    title: 'Invite your team',
    blurb: 'Escalated conversations need somebody to land on.',
  },
];

export function WorkspaceJourney({ current }: { current: JourneyStage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === current);

  return (
    /*
     * ⚠ IT NO LONGER STRETCHES TO THE FORM'S HEIGHT. The list used to be
     * `flex-1` inside a `h-full` column, which pushed the closing note to the
     * bottom of whatever the form column happened to measure — leaving a band
     * of dead space between step four and the note that read as a rendering
     * fault rather than as breathing room. The rail is shorter than the form
     * and that is fine; it sits at the top and ends where it ends.
     */
    <div className="flex flex-col">
      <p
        className="font-mono text-[10.5px] tracking-wider uppercase"
        style={{ color: 'var(--text-tertiary)' }}
      >
        What happens next
      </p>

      <ol className="mt-4 space-y-0">
        {STAGES.map((stage, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const last = index === STAGES.length - 1;

          return (
            <li key={stage.key} className="flex gap-3">
              {/* The spine: a node and the rule that joins it to the next.
                  The rule is drawn on every item but the last, so the column
                  reads as one path rather than four separate rows. */}
              <div className="flex flex-col items-center" aria-hidden>
                <span
                  className="grid size-[22px] shrink-0 place-items-center rounded-full font-mono text-[10px] font-medium"
                  style={
                    done
                      ? { background: 'var(--success-fg)', color: 'var(--ink-0)' }
                      : active
                        ? { background: 'var(--blue-500)', color: '#ffffff' }
                        : {
                            border: '1.5px solid var(--ink-200)',
                            color: 'var(--text-tertiary)',
                          }
                  }
                >
                  {done ? <IconCheck size={12} stroke={3} /> : index + 1}
                </span>
                {last ? null : (
                  <span
                    className="my-1 w-px flex-1"
                    style={{
                      background: done ? 'var(--success-fg)' : 'var(--ink-200)',
                      opacity: done ? 0.45 : 1,
                    }}
                  />
                )}
              </div>

              <div className={last ? 'pb-0' : 'pb-4'}>
                <p
                  className="text-[12.5px] leading-snug text-balance"
                  style={{
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {stage.title}
                </p>
                <p
                  className="mt-0.5 text-[11.5px] leading-relaxed text-pretty"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {stage.blurb}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p
        className="mt-6 border-t pt-3.5 text-[11px] leading-relaxed text-pretty"
        style={{ borderColor: 'var(--ink-200)', color: 'var(--text-tertiary)' }}
      >
        About ten minutes end to end. You can stop after any step and pick the
        rest up from your workspace.
      </p>
    </div>
  );
}
