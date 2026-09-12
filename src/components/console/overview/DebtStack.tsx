import Link from 'next/link';
import { IconAlertCircle, IconArrowRight, IconCircleCheck } from '@tabler/icons-react';
import type { Collection } from '@/lib/console/data';

/**
 * THE DEBT STACK. The overview's outstanding card, lower half.
 *
 * ⚠ A DECK, AND THE ORDER OF THE DECK IS THE ARGUMENT.
 *
 * One debt is expanded and the rest recede beneath it as collapsed pills,
 * narrowing as they go. The visual metaphor is doing real work: the head of
 * this list is the debt somebody can still act on, and everything under it is
 * context they should be able to see without leaving the page.
 *
 * The card previously showed `collections[0]` and nothing else, so four of the
 * five outstanding invoices were invisible until somebody opened Revenue.
 *
 * ⚠ IT RECEDES DOWNWARD, NOT UPWARD, and that is deliberate. The reference this
 * was drawn from stacks the collapsed cards ABOVE the expanded one, which works
 * where they are alternatives — flight, driving, walking — and reads as a menu.
 * These are not alternatives. They are a queue in priority order, so reading
 * order and priority order have to agree: the one to act on is first and the
 * rest descend.
 *
 * ⚠ NO NEW HUE. The reference is violet. In this system blue is interactive,
 * orange is the accent, and the status inks carry state — a violet bloom would
 * be a colour with no meaning on a card whose entire subject is money that has
 * not arrived. The expanded card blooms in `--chrome-danger`; the pills stay
 * neutral because they are not the alarm.
 *
 * ⚠ IT IS A LIST TO ANYTHING NOT LOOKING AT IT. The stack is an affordance, not
 * a structure: `ol`/`li` underneath, in the same order, so the visual hierarchy
 * and the read order cannot disagree.
 *
 * Server component. The narrowing, the depth and the hover lift are CSS; there
 * is no state here and nothing hydrates.
 */

/** How many collapsed pills before the tail line takes over. Three keeps the
 *  deck legible; past that the pills are thinner than their own text. */
const PILLS = 3;

export function DebtStack({
  collections,
  currency,
}: {
  collections: Collection[];
  currency: string;
}) {
  const [head, ...rest] = collections;

  if (!head) return <NothingOutstanding />;

  const pills = rest.slice(0, PILLS);
  const remaining = rest.length - pills.length;

  return (
    <div className="mt-6 flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-2 shrink-0 items-center justify-center">
          {/*
            ⚠ THE PULSE IS GUARDED. An indefinite animation is the first thing
            `prefers-reduced-motion` exists for. The dot still reads as danger
            without it: the colour was always carrying that, not the movement.
          */}
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full opacity-40 motion-reduce:animate-none"
            style={{ background: 'var(--danger-fg)', animationDuration: '3s' }}
          />
          <span
            aria-hidden
            className="relative size-1.5 rounded-full"
            style={{ background: 'var(--danger-fg)' }}
          />
        </span>
        {/*
          ⚠ IT NO LONGER SAYS "Oldest active debt", BECAUSE IT WAS NOT.
          `collections[0]` is Kilimanjaro at 6 days; Mombasa Freight is 94 days
          late and sits further down. The list is ordered by what is worth
          chasing — Mombasa is suspended with its attempts exhausted, so it is a
          write-off decision rather than a call. The order was right and the
          label was wrong.
        */}
        <span
          className="font-ui text-[12.5px] font-medium tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          Worth chasing first
        </span>
      </div>

      <ol className="flex flex-col">
        <li>
          <HeadCard debt={head} currency={currency} />
        </li>

        {/*
          Each pill sits a step narrower and a step quieter than the one above
          it, pulled up under the card's radius so the deck reads as one object
          rather than four. `z-index` descends so the shadow of each falls on
          the one below, which is what makes it look stacked rather than listed.
        */}
        {pills.map((debt, i) => (
          <li
            key={debt.id}
            className="relative"
            style={{
              zIndex: PILLS - i,
              marginTop: i === 0 ? -12 : -10,
              paddingInline: `${(i + 1) * 10}px`,
            }}
          >
            <DebtPill debt={debt} currency={currency} depth={i} />
          </li>
        ))}
      </ol>

      {remaining > 0 ? (
        <Link
          href="/platform/revenue"
          className="t-caption inline-flex items-center gap-1.5 self-start transition-colors"
          style={{ color: 'var(--text-action)' }}
        >
          {remaining} more outstanding
          <IconArrowRight size={12} stroke={2} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/**
 * The one to act on.
 *
 * ⚠ THE ONE INVERTED OBJECT IN THIS COLUMN, and it earns that by being the only
 * thing here somebody rings a customer about. `03 §23`: the chrome tier inverts
 * against the page, so every value inside reads `--chrome-*` rather than a raw
 * white alpha.
 */
function HeadCard({ debt, currency }: { debt: Collection; currency: string }) {
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-[20px]"
      style={{
        background: 'var(--chrome-bg-base)',
        border: '1px solid var(--chrome-rule-strong)',
        boxShadow: 'var(--shadow-lg), var(--chrome-highlight)',
      }}
    >
      {/*
        ⚠ THE HERO'S AMBIENT ART IS GONE. This tile borrowed the hero's blue
        bloom and dot grid. It spent the hero's signature twice on one page, so
        both read as less deliberate — and the bloom was BLUE, which in this
        system means interactive, on a card about money that has not arrived.
        One danger-tinted bloom, no grid. Colour that means something beats
        texture that does not.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-16 size-[220px] rounded-full opacity-[0.18] blur-[70px]"
        style={{ background: 'var(--chrome-danger)' }}
      />

      <div className="relative z-10 flex flex-col">
        <div className="px-6 pt-6">
          <p
            className="mb-2.5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.15em] uppercase"
            style={{ color: 'var(--chrome-danger)' }}
          >
            <IconAlertCircle size={13} stroke={2} aria-hidden />
            At risk account
          </p>
          <Link
            href={`/platform/tenants/${debt.slug}`}
            className="block truncate transition-colors duration-300"
            style={{
              font: '400 19px/1.25 var(--font-ui)',
              color: 'var(--chrome-fg)',
              letterSpacing: '-0.02em',
            }}
          >
            {debt.name}
          </Link>

          {/*
            ⚠ THE INVOICE NUMBER WAS IN THE MODEL AND WAS NOT DRAWN. It is the
            single most useful string on this card — what an operator quotes on
            the phone and pastes into a search. A debt card that names the
            amount and not the invoice sends somebody to go and look it up.
          */}
          <p className="mt-1.5 font-mono text-[11px]" style={{ color: 'var(--chrome-fg-faint)' }}>
            {debt.invoice}
          </p>
        </div>

        {/*
          ⚠ THE AMOUNT IS SOLID INK. It was a background-clipped gradient fading
          from white to 20% white, which did three things wrong: it read as
          disabled on the most important number on the card, its tail failed
          contrast outright, and `-webkit-text-fill-color: transparent` with no
          fallback renders the figure INVISIBLE wherever the clip is
          unsupported. A number nobody can read is not a style.
        */}
        <p className="mt-5 flex items-baseline gap-2.5 px-6 pb-6">
          <span
            className="font-mono text-[13px] font-medium tracking-[0.08em] uppercase"
            style={{ color: 'var(--chrome-fg-faint)' }}
          >
            {currency}
          </span>
          <span
            className="font-mono text-[46px] leading-none font-medium tracking-tight"
            style={{ color: 'var(--chrome-fg)' }}
          >
            {debt.amount}
          </span>
        </p>

        <dl
          className="flex items-stretch"
          style={{ background: 'var(--chrome-hover)', borderTop: '1px solid var(--chrome-rule)' }}
        >
          <Stat label="Days overdue" value={String(debt.days)} tone="danger" />
          <span aria-hidden className="w-px" style={{ background: 'var(--chrome-rule)' }} />
          {/*
            ⚠ THIS READ "2 of 3 / 3". `Collection.attempts` is already the phrase
            "2 of 3" and the component appended "/ 3" on top of it.
          */}
          <Stat label="Collection attempts" value={debt.attempts} />
        </dl>
      </div>
    </div>
  );
}

/**
 * One receding debt.
 *
 * ⚠ EACH STEP IS QUIETER, NOT JUST SMALLER. Depth is carried by three things at
 * once — inset, opacity and surface — because narrowing alone reads as a
 * rendering glitch rather than as a stack. The top padding is what lets the
 * pill above it overlap without clipping its own text.
 */
function DebtPill({
  debt,
  currency,
  depth,
}: {
  debt: Collection;
  currency: string;
  depth: number;
}) {
  const fade = 1 - depth * 0.16;

  return (
    <Link
      href={`/platform/tenants/${debt.slug}`}
      className="group/pill flex items-center gap-3 rounded-[16px] px-4 pt-5 pb-3 transition-transform duration-300 hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{
        background: 'var(--chrome-bg-raised)',
        border: '1px solid var(--chrome-rule)',
        boxShadow: 'var(--shadow-md)',
        opacity: fade,
      }}
    >
      <span
        className="min-w-0 flex-1 truncate font-ui text-[13px] font-medium"
        style={{ color: 'var(--chrome-fg-muted)' }}
      >
        {debt.name}
      </span>
      <span
        className="shrink-0 font-mono text-[10px] tracking-[0.08em] uppercase"
        style={{ color: 'var(--chrome-fg-faint)' }}
      >
        {debt.days}d
      </span>
      <span
        className="shrink-0 font-mono text-[13px] font-medium"
        style={{ color: 'var(--chrome-fg)' }}
      >
        <span className="sr-only">{currency} </span>
        {debt.amount}
      </span>
    </Link>
  );
}

/**
 * One figure in the head card's footer.
 *
 * ⚠ A `dl`, NOT TWO STACKED SPANS. Label and value is exactly what a definition
 * list describes, and declaring it costs nothing — a screen reader then reads
 * "days overdue, six" rather than two unrelated fragments.
 *
 * ⚠ THE DANGER TONE IS THE CHROME STEP. `--danger-fg` is `#c4243a`, chosen to
 * carry text on cream; on this near-black tile it is close to unreadable.
 * `--chrome-danger` is the same meaning at the step this ground needs, which is
 * the whole reason the chrome tier has its own status inks. `03 §23`.
 */
function Stat({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="flex flex-1 flex-col gap-1 px-6 py-4">
      <dt
        className="font-mono text-[9px] tracking-[0.1em] uppercase"
        style={{ color: 'var(--chrome-fg-faint)' }}
      >
        {label}
      </dt>
      <dd
        className="font-mono text-[14px] font-medium"
        style={{ color: tone === 'danger' ? 'var(--chrome-danger)' : 'var(--chrome-fg)' }}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * ⚠ NOT "Nothing is overdue." — a true sentence and a wasted one. On a card
 * whose job is naming who to ring, the good outcome should say what it checked,
 * so it cannot be mistaken for a figure that failed to load. `10 §12`.
 */
function NothingOutstanding() {
  return (
    <div className="mt-6 flex flex-col items-start gap-2">
      <IconCircleCheck size={20} stroke={1.5} style={{ color: 'var(--success-fg)' }} aria-hidden />
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
        Every invoice is settled.
      </p>
      <p
        className="t-caption"
        style={{ color: 'var(--text-secondary)', maxWidth: '38ch', textWrap: 'pretty' }}
      >
        Nothing is past due and no collection is in progress. This card names the debts worth
        chasing when any appear.
      </p>
    </div>
  );
}
