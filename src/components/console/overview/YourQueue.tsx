import Link from '@/components/structure/NavigationLink';
import {
  IconActivityHeartbeat,
  IconCircleCheck,
  IconClock,
  IconCreditCard,
  IconPlayerPause,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import type { QueueItem, QueueSeverity } from '@/lib/console/data';
import { IconTile } from '../../primitives/IconTile';
import { PagedList } from '../../primitives/Pagination';
import { SkeletonGroup, SkeletonText } from '../../primitives/Skeleton';
import { StatusBadge, type StatusBadgeTone } from '@/components/primitives/StatusBadge';
import { QueueAction } from './QueueAction';

/**
 * THE QUEUE. Design sheet 05.
 *
 * ⚠ IT IS ORDERED BY WHAT EACH ITEM COSTS TO IGNORE, not by recency. A past-due
 * workspace outranks one at 96% of its seats, which outranks one at 82% —
 * because the first is money already lost, the second is a customer about to be
 * blocked, and the third is a conversation worth having this week. That
 * ordering is what makes it a queue rather than a list.
 *
 * ⚠ FOUR STATES, ONE CODE PATH. A queue with nothing in it, with four cards,
 * and with forty all render through the same component. The states differ in
 * what they SAY rather than in how they are built:
 *
 *   EMPTY — a designed surface, not a fallback. It is also the best outcome
 *   this screen has, so it reads as an achievement rather than as an absence.
 *   10 §12: never "nothing here".
 *
 *   SHORT — no pager. `Pagination` renders nothing for a single page, so the
 *   call site does not guard it.
 *
 *   LONG — a pager appears under the cards without moving anything above it.
 *
 *   LOADING — `QueueSkeleton`, at the card's real dimensions.
 *
 * ⚠ ONLY THE ACTION HYDRATES. The cards are server-rendered and `PagedList`
 * windows the already-rendered children, so paging is instant and no card's
 * prose crosses the serialisation boundary. See `primitives/Pagination.tsx`.
 */

const SEVERITY: Record<QueueSeverity, { tone: StatusBadgeTone; icon: TablerIcon }> = {
  danger: { tone: 'danger', icon: IconCreditCard },
  warning: { tone: 'warning', icon: IconActivityHeartbeat },
  info: { tone: 'info', icon: IconClock },
  inert: { tone: 'neutral', icon: IconPlayerPause },
};

/**
 * Five cards fill the column without the page becoming a scroll exercise, and
 * five is also about as many things as an operator will work through in one
 * sitting. A queue that shows everything at once is a list; one that shows a
 * working set is a queue.
 */
const PAGE_SIZE = 5;

export function QueueCard({ item }: { item: QueueItem }) {
  const s = SEVERITY[item.severity];

  return (
    <article
      className="group relative flex flex-col rounded-card px-6 py-5 transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--card-rest)',
      }}
    >
      {/* Deep Elegant Hover Shadow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          boxShadow: 'var(--card-lift)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top Header Row: Icon, Name, and Right-Aligned Badge */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {/*
              ⚠ A RAISED TILE, NOT A FLAT TINTED CIRCLE.

              `IconPill variant="tinted"` paints a badge-coloured disc — correct
              for a status chip, which is what it was built for, and wrong as
              the leading mark on a card. The queue is the one list an operator
              works THROUGH, four or five cards deep, and a flat disc in a
              tinted wash has no edge to separate it from the card behind it.

              `IconTile` is the treatment the demo doors use: a light-to-dark
              gradient, a hairline and a small shadow, so the glyph sits ON the
              card. `lg` at 40px, because this is the first thing the eye lands
              on in a row — the dialogs use `sm` for a supporting fact, and the
              difference in weight is the difference in job.
            */}
            <IconTile
              icon={s.icon}
              size="lg"
              tone={s.tone === 'neutral' ? 'neutral' : s.tone}
              className="transition-transform duration-300 group-hover:scale-105"
            />
            <Link
              href={`/platform/tenants/${item.slug}`}
              className="truncate transition-colors hover:text-[var(--text-action)]"
              style={{
                font: '600 var(--type-lede)/1.35 var(--font-ui)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {item.name}
            </Link>
          </div>

          <div className="flex shrink-0 items-center">
            <StatusBadge tone={s.tone} variant="pill" size="sm">
              {item.tag}
            </StatusBadge>
          </div>
        </div>

        {/* Detail Text */}
        <p
          className="mt-2 pl-[42px] text-base leading-relaxed opacity-90"
          style={{ color: 'var(--text-secondary)', maxWidth: '80ch', textWrap: 'pretty' }}
        >
          {item.detail}
        </p>

        {/* Bottom Actions Row */}
        <div className="mt-4 flex items-center justify-between gap-4 pl-[42px]">
          <div className="flex min-w-0 items-center gap-3">
            <QueueAction
              action={item.action}
              slug={item.slug}
              workspace={item.name}
              observation={item.detail}
            />
            <Link
              href={`/platform/tenants/${item.slug}`}
              className="t-compact inline-flex h-8 shrink-0 cursor-pointer items-center rounded-overlay px-3.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
              style={{ color: 'var(--text-primary)', fontWeight: 500 }}
            >
              Open workspace
            </Link>
          </div>
          <span
            className="shrink-0 font-mono text-2xs font-medium tracking-[0.08em] uppercase opacity-60 transition-opacity duration-300 group-hover:opacity-100"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {item.meta}
          </span>
        </div>

        {/*
          ⚠ WHY A DEAD CONTROL SAYS WHY, ON ITS OWN LINE.

          17 §6.4 permits a disabled control only when it states its reason. The
          first two attempts put that sentence beside the button, where the
          column width truncated it — and a truncated reason is the worst of
          the three outcomes, carrying the cost of the explanation with none of
          the benefit. Here it has the card's full width and wraps.

          It renders from `action.unavailable`, the same field the control is
          built from, so a control that cannot act and a card with no
          explanation is not a state that can be constructed.
        */}
        {'unavailable' in item.action ? (
          <p
            className="t-caption mt-2.5 pl-[42px]"
            style={{ color: 'var(--text-tertiary)', maxWidth: '72ch', textWrap: 'pretty' }}
          >
            {item.action.unavailable}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function YourQueue({ queue, restingCount }: { queue: QueueItem[]; restingCount: number }) {
  return (
    <section>
      {queue.length === 0 ? (
        <QueueClear restingCount={restingCount} />
      ) : (
        <>
          <PagedList pageSize={PAGE_SIZE} noun="workspaces need attention" className="grid gap-5">
            {queue.map((item) => (
              <QueueCard key={item.id} item={item} />
            ))}
          </PagedList>

          <RestingNote restingCount={restingCount} />
        </>
      )}
    </section>
  );
}

/**
 * ⚠ THE EMPTY STATE IS THE BEST OUTCOME THIS SCREEN HAS, and it is written to
 * read that way.
 *
 * A generic "no items" would be technically correct and would waste the one
 * moment an operations screen has good news. It also has to be distinguishable
 * from a failure to load — which is why it names the count it checked rather
 * than simply reporting an absence. `EmptyState` is not used here for the same
 * reason: its centred icon-and-sentence layout is right for a region that is
 * waiting for its first record, and wrong for one reporting that a check came
 * back clean.
 */
function QueueClear({ restingCount }: { restingCount: number }) {
  return (
    <div
      className="relative flex flex-col items-start gap-3 overflow-hidden rounded-card px-6 py-8"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-raised)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-10 size-40 rounded-full opacity-[0.07] blur-2xl"
        style={{ background: 'var(--success-fg)' }}
      />
      <span
        className="relative grid size-9 place-items-center rounded-full"
        style={{ background: 'var(--success-bg)', color: 'var(--success-fg)' }}
        aria-hidden
      >
        <IconCircleCheck size={18} stroke={2} />
      </span>
      <div className="relative">
        <p
          style={{
            font: '600 var(--type-lede)/1.35 var(--font-ui)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          Nothing needs attention.
        </p>
        <p
          className="t-compact mt-1.5"
          style={{ color: 'var(--text-secondary)', maxWidth: '62ch', textWrap: 'pretty' }}
        >
          All{' '}
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {restingCount}
          </span>{' '}
          workspaces have no past-due or usage-limit alerts in this queue.
        </p>
      </div>
    </div>
  );
}

/**
 * The count of everything NOT in the queue.
 *
 * ⚠ IT IS THE DENOMINATOR, AND WITHOUT IT THE QUEUE HAS NO SCALE. Four cards
 * mean one thing against forty-seven workspaces and something else entirely
 * against six. The sentence is what stops a short queue reading as a crisis.
 */
function RestingNote({ restingCount }: { restingCount: number }) {
  return (
    <div
      className="group relative mt-6 flex items-center gap-3.5 bg-[var(--surface-inset)] px-3 py-3 transition-colors duration-300"
      style={{ borderRadius: 'var(--radius-modal)' }}
    >
      <div
        className="pointer-events-none absolute top-1/2 left-3 size-8 -translate-y-1/2 rounded-full opacity-20 blur-md transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: 'var(--success-fg)' }}
      />
      <div className="relative flex shrink-0 items-center justify-center">
        <IconCircleCheck
          size={18}
          stroke={2}
          className="relative z-10"
          style={{ color: 'var(--success-fg)' }}
          aria-hidden
        />
      </div>
      <p
        className="t-compact relative z-10 flex-1 font-medium"
        style={{ color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}
      >
        The other{' '}
        <span className="font-mono text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          {restingCount}
        </span>{' '}
        workspaces have no past-due or usage-limit alerts in this queue.
      </p>
    </div>
  );
}

/**
 * ⚠ THE SKELETON IS THE CARD'S DIMENSIONS, NOT A SPINNER. 03 §15: mirror the
 * real component's structure, vary text widths, opacity pulse and no shimmer
 * sweep. Three cards rather than five — a screenful, per the same section,
 * since a skeleton that fills the viewport claims more is coming than usually
 * is.
 */
export function QueueSkeleton() {
  return (
    <SkeletonGroup label="Loading the queue" className="grid gap-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-card px-6 py-5"
          style={{
            background: 'var(--surface-raised)',
            boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="size-6 shrink-0 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-full motion-reduce:animate-none motion-reduce:opacity-70"
              style={{ background: 'var(--surface-inset)' }}
            />
            <span className="min-w-0 flex-1">
              <SkeletonText width={[46, 38, 42][i]} className="!bg-[var(--surface-inset)]" />
            </span>
            <span
              aria-hidden
              className="h-5 w-16 shrink-0 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-full motion-reduce:animate-none motion-reduce:opacity-70"
              style={{ background: 'var(--surface-inset)' }}
            />
          </div>
          <div className="mt-3 grid gap-2 pl-[42px]">
            <SkeletonText width={[94, 88, 91][i]} className="!bg-[var(--surface-inset)]" />
            <SkeletonText width={[62, 71, 55][i]} className="!bg-[var(--surface-inset)]" />
          </div>
          <div className="mt-4 flex items-center gap-3 pl-[42px]">
            <span
              aria-hidden
              className="h-8 w-28 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-overlay motion-reduce:animate-none motion-reduce:opacity-70"
              style={{ background: 'var(--surface-inset)' }}
            />
            <span
              aria-hidden
              className="h-8 w-32 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-overlay motion-reduce:animate-none motion-reduce:opacity-70"
              style={{ background: 'var(--surface-inset)' }}
            />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
