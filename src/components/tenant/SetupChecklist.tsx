import Link from 'next/link';
import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';
import type { ChecklistStep } from '@/lib/tenant/data';

/**
 * 02 §4 · 10 §4. The setup checklist.
 *
 * ⚠ THIS IS THE HIGHEST-VALUE FOUR HOURS IN THE TENANT APPLICATION. A B2B
 * owner's entire first impression is whether they knew what to do next, and
 * this audience uses the product for twenty minutes in week one and five
 * minutes a month afterwards.
 *
 * It disappears PERMANENTLY once complete and never reappears. A checklist
 * that comes back is a nag.
 *
 * ── What this pass added, and why each one earns its place ───────────────
 *
 *  1. PROGRESS. "Two of five" plus a bar. A list of ticks tells the reader
 *     where they are only if they count; stating it removes the counting and
 *     makes the remaining work look finishable, which is the whole mechanic.
 *
 *  2. ONE CALL TO ACTION, ON THE FIRST UNFINISHED STEP ONLY. Every row was
 *     an equally-weighted link, which is five choices and therefore no
 *     recommendation. The reader gets one obvious next action and the other
 *     rows stay reachable — a single goal per session rather than a menu.
 *
 *  3. A REASON PER ROW. Each step says what it BUYS them. A setup list where
 *     every line is a chore the product wants performed is a list people
 *     leave.
 *
 *  4. DISMISS. It is a guide, not a gate, and a reader who wants it gone
 *     should not have to finish it to get their overview back. Dismissal is
 *     per-browser and deliberately quiet — see `OverviewPage` for where the
 *     cookie is read, and note it is NOT the same thing as completion.
 *
 * ⚠ NO CELEBRATION STATE LIVES HERE, ON PURPOSE. The obvious fifth addition
 * is a "you're all set" panel on completion, and it is the one the section's
 * own rule forbids: this component renders nothing at all once every step is
 * done, and a congratulation that persists on the overview is a nag wearing a
 * party hat. The completion moment belongs in the thing the last step
 * unlocked, not in the list that is now finished.
 */
export function SetupChecklist({
  steps,
  dismissible = true,
}: {
  steps: ChecklistStep[];
  dismissible?: boolean;
}) {
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;

  // The caller decides whether to render this at all; this is a guard for the
  // completed case so the rule above cannot be broken by a new call site.
  if (total === 0 || done === total) return null;

  const pct = Math.round((done / total) * 100);
  const nextKey = steps.find((s) => !s.done)?.key;

  return (
    <section
      data-reveal
      data-slot="panel"
      aria-labelledby="setup-heading"
      className="rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 md:p-8"
      style={{ boxShadow: 'var(--glass-highlight), var(--shadow-sm)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="setup-heading" className="t-panel text-[var(--text-primary)]">
            Finish setting up
          </h2>
          <p className="t-compact mt-1 text-[var(--text-secondary)]">
            {total - done} {total - done === 1 ? 'step' : 'steps'} left. You can come back to any
            of them.
          </p>
        </div>

        {dismissible ? (
          /*
            A GET on a route handler rather than a form post, so this works
            with no JavaScript and adds no client bundle to the overview. The
            handler sets the cookie and redirects straight back.
          */
          <Link
            href="/api/v1/me/onboarding/dismiss"
            prefetch={false}
            className="t-compact shrink-0 text-[var(--text-tertiary)] underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"
          >
            Hide this
          </Link>
        ) : null}
      </div>

      {/* Progress. The figure carries it for a screen reader; the bar is
          decoration and is hidden rather than announced twice. */}
      <div className="mt-4 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full"
          style={{ background: 'var(--surface-inset)' }}
          aria-hidden
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%`, background: 'var(--blue-500)' }}
          />
        </div>
        <span className="t-micro shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {done} of {total}
        </span>
      </div>

      <ol className="mt-5 grid">
        {steps.map((step) => {
          const isNext = step.key === nextKey;

          return (
            <li
              key={step.key}
              className="flex items-start gap-3 border-t py-3.5 first:border-t-0"
              style={{ borderColor: 'var(--ink-100)' }}
            >
              {/* The state marker. A filled tick or a hollow ring — never a
                  bare number, which says nothing about whether it is done. */}
              <span
                aria-hidden
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"
                style={
                  step.done
                    ? { background: 'var(--success-fg)', color: 'var(--ink-0)' }
                    : {
                        border: `1.5px solid ${
                          isNext ? 'var(--blue-500)' : 'var(--border-strong)'
                        }`,
                      }
                }
              >
                {step.done ? <IconCheck size={12} stroke={3} /> : null}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className="t-body block"
                  style={{
                    color: step.done ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    textDecoration: step.done ? 'line-through' : undefined,
                  }}
                >
                  {step.done ? step.doneLabel : step.label}
                </span>
                {step.done ? null : (
                  <span
                    className="t-compact mt-0.5 block text-pretty"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {step.hint}
                  </span>
                )}
              </span>

              {/* One recommendation. The rest stay reachable as quiet links so
                  a reader who wants step four can still have it. */}
              {step.done ? null : isNext ? (
                <Button asChild variant="primary" size="sm" className="shrink-0">
                  <Link href={step.href}>
                    {step.cta}
                    <IconArrowRight size={14} stroke={1.8} aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Link
                  href={step.href}
                  className="t-compact shrink-0 self-center text-[var(--text-tertiary)] underline-offset-4 transition-colors hover:text-[var(--text-action)] hover:underline"
                >
                  {step.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
