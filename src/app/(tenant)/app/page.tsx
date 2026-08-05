import type { Metadata } from 'next';
import { Badge } from '@/components/feedback/Badge';

export const metadata: Metadata = { title: 'Overview' };

/**
 * 02 §4. The tenant overview.
 *
 * THE SETUP CHECKLIST IS THE HIGHEST-VALUE FOUR HOURS IN THE TENANT
 * APPLICATION. A B2B owner's entire first impression is whether they knew what
 * to do next, and this audience will use the product for twenty minutes in week
 * one and five minutes a month afterwards.
 *
 * It disappears PERMANENTLY once complete and it never reappears. A checklist
 * that comes back is a nag. Copy from 10 §4.
 */

const CHECKLIST = [
  { label: 'Confirm your email', done: true, doneLabel: 'Email confirmed' },
  { label: 'Add your company details', done: false, doneLabel: 'Company details added' },
  { label: 'Invite your team', done: false, doneLabel: 'Team invited' },
  { label: 'Create an API credential', done: false, doneLabel: 'Credential created' },
  { label: 'Set your assistant rules', done: false, doneLabel: 'Rules published' },
];

export default function OverviewPage() {
  const complete = CHECKLIST.every((step) => step.done);

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <h1 className="t-title text-[var(--ink-primary)]">Overview</h1>
        <Badge tone="active" />
      </div>

      {complete ? null : (
        <section
          data-slot="panel"
          aria-labelledby="setup-heading"
          className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] p-5"
        >
          <h2 id="setup-heading" className="t-panel text-[var(--ink-primary)]">
            Set up your workspace
          </h2>
          <p className="t-compact mt-1 text-[var(--ink-secondary)]">
            Five steps. You can come back to any of them.
          </p>

          <ol className="mt-4 grid">
            {CHECKLIST.map((step, index) => (
              <li
                key={step.label}
                className="flex items-center gap-3 border-t py-3 first:border-t-0"
                style={{ borderColor: 'var(--rule-soft)' }}
              >
                <span className="t-data w-5 text-[var(--ink-tertiary)]">{index + 1}</span>
                <span
                  className="t-body"
                  style={{ color: step.done ? 'var(--ink-tertiary)' : 'var(--ink-primary)' }}
                >
                  {step.done ? step.doneLabel : step.label}
                </span>
                {step.done ? <Badge tone="active">Done</Badge> : null}
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="t-caption text-[var(--ink-tertiary)]">
        Plan usage, team size and recent activity land here at M3 and M5.
      </p>
    </div>
  );
}
