import Link from '@/components/structure/NavigationLink';
import { IconHistory } from '@tabler/icons-react';
import { Panel } from '../Surface';
import { SkeletonGroup } from '@/components/primitives/Skeleton';
import type { AuditLine } from '@/lib/console/data';
import { AUDIT_TONE, describeAction } from '@/lib/console/auditVocabulary';

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
 * ⚠ THE ROWS USED TO LEAD WITH THE RAW ACTION KEY IN MONO, AND THE ARGUMENT
 *   FOR IT DOES NOT SURVIVE BEING APPLIED TO THIS PARTICULAR PANEL.
 *
 * The reasoning was: `tenant.plan_assign` is the string an operator will later
 * search the audit log for, so a friendly paraphrase is "kinder to read and
 * useless at the moment it matters". That is sound on the AUDIT PAGE, which is
 * where somebody goes to filter — and it still shows the key there.
 *
 * It is wrong here. This is five rows on a briefing screen that is read every
 * morning, by Brian, at a glance, to decide what to do next; nobody
 * copy-pastes an action code out of a tail of five. Leading with the machine
 * key made the one panel that answers "what just happened" the least
 * answerable thing on the page.
 *
 * `describeAction` supplies the sentence and the glyph, and the same vocabulary
 * serves the audit page and the tenant activity tab — so the three surfaces
 * cannot drift into calling the same event three different things.
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
  // Semantic color mapping for audit rail prowess
  /**
   * ⚠ THIS USED TO SUBSTRING-MATCH THE RAW ACTION STRING, AND TWO OF ITS FOUR
   *   BRANCHES COULD NEVER FIRE.
   *
   * The old mapping asked `line.action.includes('master')` — no action in the
   * catalogue contains "master" — and `includes('auth')`, likewise. Meanwhile
   * `tenant.provisioned` fell through every branch to the default, so the one
   * event most worth spotting in a tail of five looked like everything else.
   *
   * Substring-matching a machine key to pick a colour is the same defect as
   * keying a map by a display string (18 §9): it breaks silently the first
   * time somebody renames an action, and it was already broken on arrival.
   * `describeAction` is one vocabulary, shared with the audit page and the
   * tenant activity tab, so the three surfaces cannot disagree about what an
   * event is called or what colour it is.
   */
  const described = describeAction(line.action);
  const tone = AUDIT_TONE[described.tone];
  const accentColor = tone.ink;
  const Glyph = described.icon;

  return (
    <div
      className="group/row relative flex gap-3 px-2 py-3 transition-colors duration-300 hover:bg-[var(--surface-sunken)]"
      style={{ '--row-accent': accentColor } as React.CSSProperties}
    >
      {/*
        Timeline axis.

        ⚠ THE NODE IS THE EVENT'S OWN GLYPH NOW, NOT A DOT.

        Five identical grey dots down a rail is a decoration that reads as a
        list of one thing repeated. The glyph answers "what happened" before
        the words are read — a door for a support session, a padlock for the
        platform lock, a building for a new workspace — which is the entire job
        of a five-row tail an operator glances at. The rail behind it still
        does the sequencing work.
      */}
      <div className="relative flex shrink-0 flex-col items-center pl-1">
        <span
          aria-hidden
          className="z-10 grid size-[22px] place-items-center rounded-full transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover/row:scale-110 motion-reduce:transition-none motion-reduce:group-hover/row:scale-100"
          style={{ background: tone.bg, border: `1px solid ${tone.edge}`, color: tone.ink }}
        >
          <Glyph size={12} stroke={1.75} />
        </span>
        {!isLast && (
          <span
            aria-hidden
            className="absolute top-[22px] -bottom-3 w-px transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover/row:bg-[color:var(--row-accent)] motion-reduce:transition-none"
            style={{ background: 'var(--border-subtle)' }}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 justify-between gap-4">
        <div className="flex min-w-0 flex-col justify-start gap-1.5">
          {/*
            ⚠ THE SENTENCE IS THE HEADLINE; THE MACHINE KEY IS GONE FROM HERE.

            This row led with `password.changed` in a mono chip — the constant's
            own value, on a briefing screen a non-engineer reads every morning.
            The human sentence leads now and the key is not shown at all: the
            audit PAGE is where somebody goes to filter by action, and it keeps
            the raw string for exactly that reason. A rail of five is for
            glancing, not for querying.
          */}
          <span
            className="text-sm leading-snug font-medium"
            style={{ color: 'var(--text-primary)', textWrap: 'pretty' }}
          >
            {described.label}
          </span>
          <span
            className="truncate text-sm leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {line.target}
          </span>
        </div>

        <span
          className="mt-0.5 shrink-0 font-mono text-2xs font-medium tracking-[0.08em] uppercase transition-colors duration-300 group-hover/row:text-[color:var(--row-accent)]"
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
    <div
      className="relative mt-1 flex flex-col items-center gap-4 overflow-hidden rounded-card px-6 py-10 text-center"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid color-mix(in srgb, var(--border-subtle) 15%, transparent)',
        boxShadow: '0 8px 32px -12px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.6) inset',
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-overlay"
        style={{
          background: 'var(--surface-inset)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <IconHistory size={22} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
      </div>
      <div>
        <p
          className="text-base font-medium tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          No platform actions yet.
        </p>
        <p
          className="t-caption mx-auto mt-1.5"
          style={{ color: 'var(--text-secondary)', maxWidth: '42ch', textWrap: 'pretty' }}
        >
          Provisioning a workspace, changing a plan or entering a support session writes here in the
          same transaction that performs it. Nothing has happened yet — this is not a failure to
          load.
        </p>
      </div>
    </div>
  );
}

/** The rail's lower card while it loads. Five rows at the real row height. */
export function LastActionsSkeleton() {
  return (
    <Panel title="Last actions" flush variant="elevated">
      <SkeletonGroup label="Loading recent actions" className="flex flex-col py-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 px-2 py-3">
            {/* Timeline axis */}
            <div className="relative flex shrink-0 flex-col items-center pl-1">
              <div className="mt-0.5 flex h-4 w-4 items-center justify-center">
                <span
                  className="h-1.5 w-1.5 rounded-full border-[1.5px]"
                  style={{ borderColor: 'var(--text-tertiary)', opacity: 0.3 }}
                />
              </div>
              {i < 4 && (
                <span
                  className="absolute top-4 -bottom-3 w-px"
                  style={{ background: 'var(--border-subtle)', opacity: 0.5 }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
              <span
                className="h-4 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-chip motion-reduce:animate-none motion-reduce:opacity-70"
                style={{ width: [110, 85, 130, 95, 120][i], background: 'var(--surface-sunken)' }}
              />
              <span
                className="h-3 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-chip motion-reduce:animate-none motion-reduce:opacity-70"
                style={{ width: [180, 220, 160, 190, 210][i], background: 'var(--surface-sunken)' }}
              />
            </div>
          </div>
        ))}
      </SkeletonGroup>
    </Panel>
  );
}
