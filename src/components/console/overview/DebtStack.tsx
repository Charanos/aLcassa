'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Link from '@/components/structure/NavigationLink';
import { IconAlertCircle, IconArrowRight, IconArrowUp, IconCircleCheck } from '@tabler/icons-react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { prefersReducedMotion } from '@/lib/motion';
import type { Collection } from '@/lib/console/data';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(Flip);
}

/**
 * THE DEBT DECK. The overview's outstanding card, lower half.
 *
 * ⚠ A DECK, AND THE ORDER OF THE DECK IS THE ARGUMENT.
 *
 * One debt is face-up and the rest recede beneath it as collapsed pills. The
 * metaphor does real work: the head of this list is the debt somebody can still
 * act on, and everything under it is context they should see without leaving
 * the page. The card previously showed `collections[0]` and nothing else, so
 * four of five outstanding invoices were invisible until somebody opened
 * Revenue.
 *
 * ⚠ IT RECEDES DOWNWARD, NOT UPWARD. The reference this was drawn from stacks
 * collapsed cards ABOVE the expanded one, which reads as a menu and is right
 * where they are alternatives. These are a queue in priority order, so reading
 * order and priority order have to agree.
 *
 * ⚠ NO NEW HUE. The reference is violet. Here blue is interactive, orange is the
 * accent, and the status inks carry state — a violet bloom would be a colour
 * with no meaning on a card about money that has not arrived. The face-up card
 * blooms `--chrome-danger`; the pills stay neutral because they are not the
 * alarm.
 *
 * ⚠ IT IS A CLIENT COMPONENT, AND ONLY BECAUSE OF THE DECK.
 *
 * It began as a server component. Turning a card over is state, so it is one
 * now — but the cost is real and worth naming: every debt's markup crosses the
 * serialisation boundary to buy one interaction. That trade is acceptable here
 * because the list is bounded at five and the interaction replaces a page
 * navigation. On a longer list it would not be.
 *
 * ⚠ IT IS A LIST TO ANYTHING NOT LOOKING AT IT. The deck is an affordance, not a
 * structure: `ol`/`li` underneath, so the visual arrangement and the read order
 * cannot disagree.
 */

/** How many collapsed pills before the tail link takes over. */
const PILLS = 2;

/**
 * ⚠ 340ms, NOT 500. A card moving roughly ninety pixels does not need half a
 * second, and at 500ms with `power3` the deck read as heavy — the motion
 * finished noticeably after the click that caused it, which is what makes an
 * interface feel slow rather than smooth. The system's slow token is 260ms;
 * this is a layout change rather than a fade, so it earns a little more.
 */
const FLIP_MS = 0.34;

export function DebtStack({
  collections,
  currency,
}: {
  collections: Collection[];
  currency: string;
}) {
  const [deck, setDeck] = useState(collections);
  const containerRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  /** The real head of the queue, whatever is currently face-up. */
  const priority = collections[0];

  function bringToFront(id: string) {
    if (!deck[0] || deck[0].id === id) return;

    flipState.current = Flip.getState('.deck-card');

    setDeck((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      /* The clicked card moves to the front; everything else keeps its relative
         order, so the pills below stay in priority order and only which card is
         face-up changes. */
      return [prev[idx]!, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }

  useLayoutEffect(() => {
    const state = flipState.current;
    flipState.current = null;
    if (!state || !containerRef.current) return;

    /*
      ⚠ REDUCED MOTION SKIPS THE TWEEN, NOT THE CHANGE. The DOM has already
      re-rendered in its new order by the time this runs, so returning early
      leaves the reader on the correct end state instantly — which is what
      sheet 13 asks for, rather than a shortened animation.
    */
    if (prefersReducedMotion()) return;

    Flip.from(state, {
      duration: FLIP_MS,
      /*
        ⚠ `power2.out`, NOT `power3`. The stronger curve front-loads almost all
        the distance and then crawls, which is what read as clanky on a move
        this short — the card appeared to arrive and then keep settling.
      */
      ease: 'power2.out',
      /*
        ⚠ THREE THINGS REMOVED FROM THIS CALL, EACH OF THEM A CAUSE OF THE JUDDER.

        `absolute: true` lifted every card out of flow for the duration, so the
        container collapsed mid-flight and the content below it jumped twice —
        once out, once back.

        `zIndex: 50` was applied to ALL targets at once, flattening their
        relative layering exactly while they crossed each other, which is when
        layering matters most. Stacking is set in CSS now and never tweened; an
        integer property cannot be interpolated smoothly anyway.

        `nested: true` costs a subtree walk per target and there are no nested
        Flip containers here. It was doing nothing but work.
      */
      targets: '.deck-card',
    });
  }, [deck]);

  if (deck.length === 0) return <NothingOutstanding />;

  const head = deck[0]!;
  const rest = deck.slice(1);
  const pills = rest.slice(0, PILLS);
  const remaining = rest.length - pills.length;
  const showingPriority = !priority || head.id === priority.id;

  return (
    <div className="mt-4 flex flex-col gap-3.5" ref={containerRef}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="relative flex size-2 shrink-0 items-center justify-center">
            {/*
              ⚠ THE PULSE IS GUARDED. An indefinite animation is the first thing
              `prefers-reduced-motion` exists for. The dot still reads as danger
              without it: the colour carries that, the movement never did.
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
            `collections[0]` is 6 days late; Mombasa Freight, further down, is
            94. The list is ordered by what is worth CHASING — Mombasa is
            suspended with its attempts exhausted, so it is a write-off decision
            rather than a call. The order was right and the label was wrong.
          */}
          <span
            className="font-ui text-sm font-medium tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            Review first
          </span>
        </span>

        {/*
          ⚠ TURNING A CARD OVER MADE THE HEADING LIE, AND THIS IS THE FIX.

          Promoting a pill is a good affordance — it inspects another debt
          without leaving the page. But the label above claims the face-up card
          is the one to chase first, and after a click that is no longer true.
          Rather than weaken the label into something vague, the deck admits
          when it is not showing the top of the queue and offers the way back.
        */}
        {!showingPriority && priority ? (
          <button
            type="button"
            onClick={() => setDeck(collections)}
            className="t-caption inline-flex shrink-0 items-center gap-1 transition-colors"
            style={{ color: 'var(--text-action)' }}
          >
            <IconArrowUp size={12} stroke={2} aria-hidden />
            Top of queue
          </button>
        ) : null}
      </div>

      <ol className="flex flex-col">
        <li data-flip-id={head.id} className="deck-card relative z-10">
          <HeadCard debt={head} currency={currency} />
        </li>

        {pills.map((debt, i) => (
          <li
            key={debt.id}
            data-flip-id={debt.id}
            className="deck-card relative"
            /*
              ⚠ THE SCALE IS ON THE PILL, NOT ON THIS ELEMENT. Flip animates the
              transform of its targets, and an inline `scale()` on the same node
              is a second author of the same property — they fought, and the
              result was the card visibly snapping to size at the end of the
              move. The flip target carries position only.
            */
            style={{ zIndex: PILLS - i, marginTop: -16 }}
          >
            <DebtPill
              debt={debt}
              currency={currency}
              depth={i}
              onSelect={() => bringToFront(debt.id)}
            />
          </li>
        ))}
      </ol>

      {remaining > 0 ? (
        <Link
          href="/platform/revenue"
          className="t-caption mt-2 inline-flex items-center gap-1.5 self-start transition-colors"
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
 * The card that is face-up.
 *
 * ⚠ THE ONE INVERTED OBJECT IN THIS COLUMN, and it earns that by being the only
 * thing here somebody rings a customer about. `03 §23`: the chrome tier inverts
 * against the page, so every value inside reads `--chrome-*` rather than a raw
 * white alpha.
 */
function HeadCard({ debt, currency }: { debt: Collection; currency: string }) {
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-card"
      style={{
        background: 'var(--chrome-bg-base)',
        border: '1px solid var(--chrome-rule-strong)',
        boxShadow: 'var(--shadow-lg), var(--chrome-highlight)',
      }}
    >
      {/*
        ⚠ THE HERO'S AMBIENT ART DOES NOT BELONG HERE.

        This tile borrowed the hero's blue bloom and dot grid. Two problems, and
        the second is the serious one: it spends the hero's signature twice on
        one page, so both read as less deliberate — and the bloom was BLUE,
        which in this system means interactive and brand, on a card whose entire
        subject is money that has not arrived.

        One bloom, in `--chrome-danger`, no grid. Colour that means something
        beats texture that does not.

        ⚠ NO HOVER SCALE EITHER. `hover:scale-[1.01]` on a card containing a
        46px numeral resamples the text on every frame of the transition, and
        the figure visibly softens. The card is not a button; the controls
        inside it are.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-16 size-[220px] rounded-full opacity-[0.18] blur-[70px]"
        style={{ background: 'var(--chrome-danger)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
        }}
      />

      <div className="relative z-10 flex flex-col">
        <div className="px-6 pt-6">
          <p
            className="mb-2.5 flex items-center gap-1.5 font-mono text-2xs tracking-[0.15em] uppercase"
            style={{ color: 'var(--chrome-danger)' }}
          >
            <IconAlertCircle size={13} stroke={2} aria-hidden />
            At risk account
          </p>
          <Link
            href={`/platform/tenants/${debt.slug}`}
            className="block truncate transition-colors duration-300"
            style={{
              font: '400 var(--type-panel)/1.25 var(--font-ui)',
              color: 'var(--chrome-fg)',
              letterSpacing: '-0.02em',
            }}
          >
            {debt.name}
          </Link>

          {/*
            The plan and the arithmetic behind the amount: how many monthly
            charges have fallen due since it went past due, at what price.
            Phase 1 raises no invoices, so there is no invoice number to quote
            (doc 25 · R1).
          */}
          <p className="mt-1.5 font-mono text-xs" style={{ color: 'var(--chrome-fg-faint)' }}>
            {debt.plan} · {debt.periods} × {currency} {debt.monthly}
          </p>
        </div>

        {/*
          ⚠ THE AMOUNT IS SOLID INK, WITH NO GLOW BEHIND IT. It was once a
          background-clipped gradient fading to 20% white — which read as
          disabled on the most important number on the card, failed contrast at
          its tail, and rendered INVISIBLE wherever the clip is unsupported. The
          white text-shadow that replaced it was doing nothing visible on a
          near-black ground except adding a raw value.
        */}
        <p className="mt-4 flex items-baseline gap-2.5 px-6 pb-7">
          <span
            className="font-mono text-base font-medium tracking-[0.08em] uppercase"
            style={{ color: 'var(--chrome-fg-faint)' }}
          >
            {currency}
          </span>
          <span
            className="font-mono text-3xl leading-none font-medium tracking-tight"
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
          <Stat label="State" value={debt.state === 'suspended' ? 'Suspended' : 'Read-only'} />
        </dl>
      </div>
    </div>
  );
}

/**
 * One card still face-down.
 *
 * ⚠ DEPTH IS THREE THINGS AT ONCE — ground, opacity and scale. A stack read
 * only through opacity looks like a rendering fault; one read only through size
 * looks like a scaling bug. The top padding is what lets the card above overlap
 * it without clipping this one's own text.
 */
function DebtPill({
  debt,
  currency,
  depth,
  onSelect,
}: {
  debt: Collection;
  currency: string;
  depth: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Show ${debt.name}, ${currency} ${debt.amount}, ${debt.days} days overdue`}
      className="group/pill flex w-full origin-top items-center gap-3 rounded-card px-5 pt-6 pb-4 transition-[opacity,transform] duration-300 hover:-translate-y-px hover:opacity-100 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{
        background: depth === 0 ? 'var(--deck-near)' : 'var(--deck-far)',
        border: '1px solid var(--deck-rule)',
        boxShadow: 'var(--deck-shadow)',
        opacity: 1 - depth * 0.16,
        transform: `scale(${1 - (depth + 1) * 0.04})`,
      }}
    >
      <span
        className="font-ui min-w-0 flex-1 truncate text-left text-base font-medium"
        style={{ color: 'var(--chrome-fg-muted)' }}
      >
        {debt.name}
      </span>
      <span
        className="shrink-0 font-mono text-2xs tracking-[0.08em] uppercase"
        style={{ color: 'var(--chrome-fg-faint)' }}
      >
        {debt.days}d
      </span>
      <span
        className="shrink-0 font-mono text-base font-medium"
        style={{ color: 'var(--chrome-fg)' }}
      >
        <span className="sr-only">{currency} </span>
        {debt.amount}
      </span>
    </button>
  );
}

/**
 * One figure in the face-up card's footer.
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
        className="font-mono text-3xs tracking-[0.1em] uppercase"
        style={{ color: 'var(--chrome-fg-faint)' }}
      >
        {label}
      </dt>
      <dd
        className="font-mono text-base font-medium"
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
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        No estimated amounts due.
      </p>
      <p
        className="t-caption"
        style={{ color: 'var(--text-secondary)', maxWidth: '38ch', textWrap: 'pretty' }}
      >
        No workspace currently requires payment follow-up in this subscription summary.
      </p>
    </div>
  );
}
