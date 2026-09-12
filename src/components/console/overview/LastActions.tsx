import Link from 'next/link';
import { IconHistory } from '@tabler/icons-react';
import { Panel } from '../Surface';
import { SkeletonGroup, SkeletonText } from '@/components/primitives/Skeleton';
import type { AuditLine } from '@/lib/console/data';

/**
 * LAST ACTIONS. The overview's right rail, lower card.
 *
 * ⚠ EXTRACTED FROM `page.tsx`, WHERE IT WAS NINETY INLINE LINES.
 *
 * Same move the queue and the bands already made: one file per section of the
 * screen, server-rendered, taking a typed slice of the read model. The page is
 * now a composition rather than a place markup accumulates.
 *
 * ⚠ IT IS A SERVER COMPONENT AND SHIPS NO JAVASCRIPT. The timeline axis, the
 * node, the connecting line and the hover states are all CSS. The version this
 * replaces was the same — extracting it kept that, which is the point of
 * checking before moving something into a folder full of client components.
 *
 * ⚠ THE TAIL IS FIVE ROWS, AND IT LINKS RATHER THAN PAGES. A pager here would
 * be wrong: this is a TAIL of a log, not a list somebody works through. The
 * question "what happened before this" has a better answer than a page-two
 * button, and it is the audit log, which has filters, a volume histogram and a
 * range export. The link is the pagination.
 *
 * ⚠ WHY EACH ROW SHOWS ITS ACTION NAME IN MONO. `tenant.plan_assign` is the
 * string an operator will later search the audit log for. Rendering a friendly
 * paraphrase would be kinder to read and useless at the moment it matters —
 * the same argument the support dialog makes for showing `support_session.start`
 * beside its confirm button.
 */
export function LastActions({ recent }: { recent: AuditLine[] }) {
  return (
    <Panel
      title="Last actions"
      flush
      variant="elevated"
      action={
        <Link href="/platform/audit" className="t-caption" style={{ color: 'var(--text-action)' }}>
          Audit log
        </Link>
      }
    >
      {recent.length === 0 ? (
        <NoActionsYet />
      ) : (
        <div className="flex flex-col py-1">
          {recent.map((r, i) => (
            <ActionRow key={`${r.time}-${r.action}`} line={r} isLast={i === recent.length - 1} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function ActionRow({ line, isLast }: { line: AuditLine; isLast: boolean }) {
  return (
    <div className="group/row relative flex gap-3 px-2 py-3 transition-colors duration-300 hover:bg-[var(--surface-sunken)]">
      {/* Timeline axis */}
      <div className="relative flex shrink-0 flex-col items-center pl-1">
        <div className="mt-0.5 flex h-4 w-4 items-center justify-center">
          {/*
            The node grows and fills on hover. `motion-reduce` stops the scale
            rather than the colour — a reader who has asked for less motion
            still wants to know which row the pointer is on.
          */}
          <span
            aria-hidden
            className="z-10 h-1.5 w-1.5 rounded-full border-[1.5px] bg-transparent transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover/row:scale-[1.75] group-hover/row:border-[color:var(--blue-500)] group-hover/row:bg-[var(--blue-500)] motion-reduce:transition-none motion-reduce:group-hover/row:scale-100"
            style={{ borderColor: 'var(--text-tertiary)' }}
          />
        </div>
        {!isLast && (
          <span
            aria-hidden
            className="absolute top-4 -bottom-3 w-px transition-colors duration-500 group-hover/row:bg-[var(--blue-400)] motion-reduce:transition-none"
            style={{ background: 'var(--border-subtle)' }}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 justify-between gap-4">
        <div className="flex min-w-0 flex-col justify-start gap-1.5">
          <span className="flex items-center">
            <span
              className="rounded-[4px] px-1.5 py-0.5 font-mono text-[11px] leading-none font-medium transition-colors duration-200 group-hover/row:bg-[var(--blue-500)] group-hover/row:text-[var(--text-inverse)]"
              style={{
                background: 'var(--surface-inset)',
                color: 'var(--text-secondary)',
                letterSpacing: '-0.02em',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {line.action}
            </span>
          </span>
          <span
            className="text-[13px] leading-relaxed font-medium"
            style={{ color: 'var(--text-primary)', textWrap: 'pretty' }}
          >
            {line.target}
          </span>
        </div>

        <span
          className="mt-0.5 shrink-0 font-mono text-[10.5px] font-semibold tracking-[0.08em] uppercase transition-colors duration-300 group-hover/row:text-[var(--text-action)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {line.time}
        </span>
      </div>
    </div>
  );
}

/**
 * ⚠ AN EMPTY AUDIT TAIL IS A REAL AND CORRECT STATE, and it had none.
 *
 * A platform on its first day has done nothing yet. Rendering an empty panel
 * would read as a failure to load on the one surface whose whole claim is that
 * an action missing from the log did not happen — so it says which of the two
 * it is. `10 §12`: never "nothing here".
 */
function NoActionsYet() {
  return (
    <div className="flex flex-col items-start gap-2 px-4 py-8">
      <IconHistory size={20} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
        No platform actions yet.
      </p>
      <p
        className="t-caption"
        style={{ color: 'var(--text-secondary)', maxWidth: '42ch', textWrap: 'pretty' }}
      >
        Provisioning a workspace, changing a plan or entering a support session writes here in the
        same transaction that performs it. Nothing has happened yet — this is not a failure to
        load.
      </p>
    </div>
  );
}

/** The rail's lower card while it loads. Five rows at the real row height. */
export function LastActionsSkeleton() {
  return (
    <Panel title="Last actions" flush variant="elevated">
      <SkeletonGroup label="Loading recent actions" className="flex flex-col gap-3 px-3 py-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="grid gap-1.5">
            <SkeletonText width={[34, 40, 30, 38, 33][i] ?? 34} />
            <SkeletonText width={[72, 64, 80, 58, 69][i] ?? 70} />
          </div>
        ))}
      </SkeletonGroup>
    </Panel>
  );
}
