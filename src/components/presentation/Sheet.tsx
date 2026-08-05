import type { Icon as TablerIcon } from '@tabler/icons-react';

/**
 * The tracker is drawn as a DRAFTING SHEET, because that is what the design
 * system is: measured rules, annotated dimensions, a title block in the corner,
 * a revision number. 03 §1.
 *
 * These are presentation-only primitives. They consume the same tokens as the
 * product and introduce no new ones, which is the point: the client is looking
 * at the design system while reading about it.
 */

export function SheetSection({
  id,
  n,
  title,
  lede,
  aside,
  children,
}: {
  id: string;
  n: string;
  title: string;
  lede?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-section
      data-slot="sheet-section"
      /*
       * `min-w-0` IS LOad-BEARING AND IT IS NOT OBVIOUS.
       *
       * Every section is a grid item. A grid item defaults to `min-width: auto`,
       * which means it refuses to shrink below the intrinsic width of its widest
       * descendant. The widest descendant here is a five-column table, so at
       * narrow viewports the track was being forced to ~850px and the whole
       * PAGE scrolled sideways rather than the table scrolling inside its own
       * container, which is what its `overflow-x-auto` wrapper was there to do.
       *
       * `min-w-0` lets the track shrink, the wrapper starts clipping again, and
       * the body stops scrolling horizontally. 03 §17: 200% zoom with no
       * truncation and no horizontal scroll. The same applies to any grid item
       * on this page that can contain a table or a long unbroken string.
       */
      className="min-w-0 scroll-mt-24 border-t pt-10 md:pt-14"
      style={{ borderColor: 'var(--rule-strong)' }}
      aria-labelledby={`${id}-heading`}
    >
      <div className="flex items-baseline gap-4">
        <span className="t-eyebrow shrink-0 text-[var(--copper-ink)]">{n}</span>
        <h2 id={`${id}-heading`} className="t-heading text-[var(--ink-primary)]">
          {title}
        </h2>
        {/* The rule between the heading and its annotation is drawn out by
            GSAP rather than simply appearing, which is the one gesture on this
            page borrowed directly from the drafting metaphor. */}
        <span
          data-draw-rule
          aria-hidden
          className="hidden h-px flex-1 origin-left self-center md:block"
          style={{ background: 'var(--rule-soft)' }}
        />
        {aside ? (
          <span className="t-eyebrow hidden shrink-0 text-[var(--ink-tertiary)] md:block">
            {aside}
          </span>
        ) : null}
      </div>

      {lede ? (
        <p
          data-reveal
          className="t-lede mt-4 text-[var(--ink-secondary)]"
          style={{ maxWidth: 'var(--measure-prose)' }}
        >
          {lede}
        </p>
      ) : null}

      <div className="mt-6">{children}</div>
    </section>
  );
}

export type Tone = 'copper' | 'ochre' | 'verdigris' | 'slate' | 'oxide' | 'graphite';

/**
 * ⚠ THE 3px LEFT RULE IS GONE, AND IT SHOULD BE.
 *
 * It was doing three jobs badly at once. It made every panel look like a
 * callout even when the panel was ordinary content; a page of them read as a
 * stack of warnings. It broke the card's own geometry, so the left padding no
 * longer matched the other three sides. And it encoded state in a place the eye
 * scans last, at the extreme left edge, below the heading it belongs to.
 *
 * State now lives where it is read: in the chip on the title line, which
 * already carries a glyph and a word, so it survives colour blindness and a
 * printed page. A panel with a `tone` gets one HAIRLINE ACCENT ALONG ITS TOP
 * EDGE instead: it reads as a card with a marked edge rather than a quoted
 * block, it keeps the padding symmetrical, and it sits directly above the
 * heading it qualifies.
 *
 * A panel with no state gets no accent at all, which is most of them.
 */
export function Panel({
  children,
  className,
  tone,
  reveal = true,
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: Tone;
  reveal?: boolean;
  /** Lifts on hover. For panels that are, or contain, a destination. */
  interactive?: boolean;
}) {
  return (
    <div
      data-slot="panel"
      data-tone={tone}
      {...(reveal ? { 'data-reveal': '' } : {})}
      className={[
        'relative min-w-0 overflow-hidden rounded-panel border p-5',
        'transition-[border-color,box-shadow,transform] duration-[var(--motion-base,200ms)]',
        interactive ? 'panel-lift hover:-translate-y-0.5 hover:border-[var(--rule-base)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: 'var(--surface-raised)',
        // A softer hairline than the tables use: with three layers of light
        // doing the separating, a full-strength rule reads as a second edge.
        borderColor: 'var(--rule-soft)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {tone ? (
        <>
          {/*
           * THE ACCENT, SOFTENED TO MATCH THE CARD.
           *
           * A 3px rule down the left made every panel read as a callout. A hard
           * 1px line across the top replaced that with a stray line touching
           * nothing. Both were the same mistake: a hard edge on a soft surface.
           *
           * This is light rather than line. The hue bleeds down from the top in
           * a wash that fades to nothing before the heading, and a short soft
           * segment sits at the corner where the eye enters the card, blurred
           * at its trailing end so it dissolves rather than stops. No part of it
           * has a crisp boundary, which is what lets it sit on a card whose own
           * lift is made of light.
           *
           * State is still carried by the chip on the title line, which has the
           * glyph and the word. This is atmosphere, and it is allowed to be
           * quiet because it is not the thing doing the work.
           */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 block h-24"
            style={{
              background: `radial-gradient(120% 100% at 12% 0%, color-mix(in oklab, var(--${tone}-tint) 85%, transparent) 0%, transparent 70%)`,
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-5 block h-[3px] w-24 rounded-b-full"
            style={{
              background: `linear-gradient(to right, color-mix(in oklab, var(--${tone}-ink) 55%, transparent), transparent)`,
              filter: 'blur(0.5px)',
            }}
          />
        </>
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

/** A key-and-value pair in the title-block idiom. Label in micro caps above,
 *  value in mono below. Used across the sheet header and the fact bands. */
export function Fact({
  k,
  v,
  tone,
  hero = false,
}: {
  k: string;
  v: string;
  tone?: string;
  hero?: boolean;
}) {
  return (
    <div data-slot="fact" {...(hero ? { 'data-hero-fact': '' } : {})}>
      {/* Tertiary rather than faint: this label names the value beneath it, so
          it carries information and belongs above the 3:1 step. */}
      <dt className="t-eyebrow text-[var(--ink-tertiary)]">{k}</dt>
      <dd className="t-data mt-1.5" style={{ color: tone ?? 'var(--ink-primary)' }}>
        {v}
      </dd>
    </div>
  );
}

/**
 * The status chip. THE one place state is expressed.
 *
 * Glyph, word and tint together, so meaning survives colour blindness and a
 * printed audit export, and so no reader ever has to learn what a colour means.
 * 03 §3 rule 3, and the reason the left borders were not needed.
 */
export function StatusChip({
  tone,
  icon: Icon,
  children,
  size = 'md',
}: {
  tone: Tone;
  icon: TablerIcon;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className="t-chip inline-flex shrink-0 items-center gap-1.5 rounded-chip border"
      style={{
        color: `var(--${tone}-ink)`,
        background: `var(--${tone}-tint)`,
        borderColor: `var(--${tone}-rule)`,
        padding: size === 'sm' ? '1px 6px' : '2px 8px',
      }}
    >
      <Icon size={11} stroke={1.5} aria-hidden />
      {children}
    </span>
  );
}

/**
 * A headline number. The value counts up once when it scrolls into view, which
 * 03 §20 lists as an anti-pattern for the PRODUCT and is right about it there:
 * a metric you have to wait for is a metric that wasted your time. Here there
 * are four, they are the headline, they are read once, and the count is what
 * makes a reader look at them at all.
 *
 * The final value is rendered by the server, so a reader with JavaScript off or
 * reduced motion on sees the number rather than a zero.
 */
export function StatTile({
  label,
  value,
  suffix,
  tone,
  note,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: string;
  note: string;
}) {
  return (
    <div
      data-reveal
      className="rounded-panel border p-5"
      style={{
        background: 'var(--surface-raised)',
        borderColor: 'var(--rule-base)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="t-eyebrow text-[var(--ink-tertiary)]">{label}</div>
      <div className="mt-3 flex items-baseline gap-0.5" style={{ color: tone }}>
        <span
          data-count={value}
          className="t-data tabular-nums"
          style={{ fontSize: '34px', lineHeight: 1 }}
        >
          {value}
        </span>
        {suffix ? (
          <span className="t-data" style={{ fontSize: '18px', opacity: 0.65 }}>
            {suffix}
          </span>
        ) : null}
      </div>
      <p className="t-caption mt-2.5 text-[var(--ink-tertiary)]">{note}</p>
    </div>
  );
}
