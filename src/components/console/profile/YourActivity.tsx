import Link from '@/components/structure/NavigationLink';
import { IconArrowRight, IconShieldLock } from '@tabler/icons-react';
import type { OperatorAction } from '@/lib/console/data';
import { describeAction } from '@/lib/console/auditVocabulary';
import { PagedList } from '@/components/primitives/Pagination';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { SettingsSection } from '@/components/console/Surface';
import { EmptyState } from '@/components/primitives/EmptyState';
import { RecordRow } from '@/components/console/profile/shared';

/**
 * The last things you did, on your own screen.
 *
 * ⚠ THE RAIL SAID "412 by you" AND OFFERED NO WAY TO SEE THEM.
 *
 * That is the shape of gap this pass keeps finding: a figure with no handle. The
 * number was real, it was the most interesting fact on the rail, and a reader
 * who wanted to know WHICH 412 had to go to the audit screen and construct a
 * filter for themselves — on a screen whose entire premise is showing an
 * operator their own footprint.
 *
 * ⚠ AND IT IS THE HALF OF THE ACCOUNTABILITY ARGUMENT THAT WAS MISSING.
 *
 * `LimitsCard` states the ceiling: what this admin cannot reach. This states the
 * record: what they actually did reach. A security review asks both questions,
 * and until now the profile answered only the first — so the page made its
 * strongest claim ("the person with the most access is shown their own limit")
 * without ever showing the consequences of the access they do have.
 *
 * ⚠ `usedServiceRole` IS RENDERED, because it is the one column an auditor
 * filters on. 05 §9: "when did we bypass RLS, and why" has to be answerable with
 * a single filter, and a row that bypassed it looks no different from one that
 * did not unless the screen says so. The badge is deliberately `info` rather
 * than `warning` — a service-role call is the normal way a platform action
 * reaches a tenant's data, not an alarm.
 */
const PAGE_SIZE = 6;

export function YourActivity({
  actions,
  total,
}: {
  actions: OperatorAction[];
  /** Everything in the window, not just what is listed. */
  total: number;
}) {
  return (
    <SettingsSection
      title="Your recent activity"
      standfirst="Your recorded platform actions from the last 30 days."
      flush
      action={
        /* ⚠ A BAND WITHOUT A ROUTE OUT IS DECORATION. Six rows is a sample; the
           audit screen is the record, and it is where somebody goes when one of
           these rows is the thing they came to check. */
        <Link
          href="/platform/audit"
          className="t-compact group inline-flex items-center gap-1.5 rounded-chip transition-colors hover:text-[var(--blue-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
          style={{ color: 'var(--blue-500)', fontWeight: 500 }}
        >
          Full audit log
          <IconArrowRight
            size={13}
            stroke={2}
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
        </Link>
      }
      footer={
        total > actions.length ? (
          <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
            {total} actions in the last 30 days. The {actions.length} most recent are listed.
          </p>
        ) : null
      }
    >
      {actions.length === 0 ? (
        /*
         * ⚠ A DESIGNED EMPTY, AND A GOOD ONE. A new admin has done nothing yet,
         * and that is not a failure to load — it is the first day. Saying so is
         * better than an empty panel that reads as a broken query.
         */
        <EmptyState
          icon={IconShieldLock}
          title="Nothing recorded yet"
          body="Platform actions you take appear here the moment they happen, with your name against them. Nothing in the last 30 days."
        />
      ) : (
        <div className="px-5 pt-1 pb-2">
          <PagedList pageSize={PAGE_SIZE} noun="actions" label="Activity pages">
            {actions.map((entry) => (
              <div key={entry.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <RecordRow
                  label={
                    <span className="flex flex-wrap items-center gap-2">
                      {/* ⚠ THE ACTION IS MONO. It is a catalogue key —
                          `tenant.suspended`, `rules.published` — not prose, and
                          setting it in the UI face invites a reader to treat it
                          as a sentence somebody wrote. */}
                      <span style={{ font: '500 var(--type-compact)/1.4 var(--font-ui)' }}>
                        {describeAction(entry.action).label}
                      </span>
                      {entry.usedServiceRole ? (
                        <StatusBadge tone="info" variant="squircle" size="sm">
                          Privileged action
                        </StatusBadge>
                      ) : null}
                    </span>
                  }
                  detail={
                    entry.reason ? (
                      entry.reason
                    ) : (
                      /* No reason is a fact about the row, not a blank. Several
                         actions genuinely do not take one. */
                      <span style={{ color: 'var(--text-tertiary)' }}>No reason recorded</span>
                    )
                  }
                  meta={
                    <span className="grid gap-0.5 text-right">
                      <span
                        className="whitespace-nowrap"
                        style={{
                          font: '400 var(--type-compact)/1.4 var(--font-ui)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {entry.when}
                      </span>
                      {entry.target ? (
                        <span
                          className="whitespace-nowrap"
                          style={{
                            font: '400 var(--type-chip)/1.4 var(--font-mono)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {entry.target}
                        </span>
                      ) : null}
                    </span>
                  }
                />
              </div>
            ))}
          </PagedList>
        </div>
      )}
    </SettingsSection>
  );
}
