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
      style={{ borderColor: 'var(--border-strong)' }}
      aria-labelledby={`${id}-heading`}
    >
      <div className="flex items-baseline gap-4">
        <span className="t-eyebrow shrink-0 text-[var(--blue-500)]">{n}</span>
        <h2 id={`${id}-heading`} className="t-heading text-[var(--text-primary)]">
          {title}
        </h2>
        {/* The rule between the heading and its annotation is drawn out by
            GSAP rather than simply appearing, which is the one gesture on this
            page borrowed directly from the drafting metaphor. */}
        <span
          data-draw-rule
          aria-hidden
          className="hidden h-px flex-1 origin-left self-center md:block"
          style={{ background: 'var(--ink-100)' }}
        />
        {aside ? (
          <span className="t-eyebrow hidden shrink-0 text-[var(--text-tertiary)] md:block">
            {aside}
          </span>
        ) : null}
      </div>

      {lede ? (
        <p
          data-reveal
          className="t-lede mt-4 text-[var(--text-secondary)]"
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
 * ⚠ THE ACCENT, THIRD REWRITE. COLOURED NEUMORPHISM RATHER THAN A MARK.
 *
 * Attempt one was a 3px rule down the left: every panel read as a callout, and
 * a page of them read as a stack of warnings. Attempt two was a hairline across
 * the top, then a soft wash bleeding from the corner: both were a decoration
 * drawn ON the card rather than a property OF it, and on review they read as
 * exactly that, an applied mark rather than something the surface itself was
 * doing.
 *
 * This version has no drawn mark at all. THE SHADOW ITSELF CARRIES THE HUE.
 * A toned panel's neumorphic pair, the soft light catching its near lip and the
 * soft shade falling away from it, is mixed from `--{tone}-ink` rather than
 * from neutral graphite. The result is a card that glows faintly the colour of
 * its own state, which is the actual definition of "coloured neumorphism" as
 * distinct from the plain kind: the elevation model does not change, only
 * which hue it is lit with.
 *
 * `color-mix()` against `--{tone}-ink` is what makes this theme-safe without a
 * second definition: that token is already re-tuned per theme for contrast, so
 * the same formula reads as a muted glow in light and a warmer one in dark with
 * no `[data-theme='dark']` branch needed here.
 *
 * State is still named and worded on the chip on the title line. The colour on
 * the card is atmosphere confirming what the chip already said, never the only
 * carrier of it. 03 §3 rule 3.
 */
function toneShadow(tone: Tone | undefined): string | undefined {
  if (!tone) return undefined;

  // EXTREMELY SOFT is the brief. Wide blur, low offset, low saturation of the
  // mix: a colour a reader would struggle to name if asked, and would still
  // clock as "belonging together" if six of these sat in a row. That is the
  // register a glow needs to hold, distinct from a badge, which is allowed to
  // be exact because naming the state precisely is its entire job.
  return [
    `-3px -3px 12px color-mix(in oklab, var(--${tone}-ink) 8%, transparent)`,
    `4px 5px 18px color-mix(in oklab, var(--${tone}-ink) 8%, transparent)`,
    `0 0 0 1px color-mix(in oklab, var(--${tone}-rule) 30%, var(--border-subtle) 70%)`,
    'var(--shadow-sm)',
  ].join(', ');
}

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
        'relative min-w-0 overflow-hidden rounded-card px-6 py-5',
        'transition-[box-shadow,transform] duration-[var(--motion-base,200ms)]',
        interactive && !tone
          ? 'panel-lift hover:-translate-y-0.5 hover:shadow-[var(--shadow-md),_0_0_0_1px_var(--border-strong)]'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: 'white',
        boxShadow: toneShadow(tone) ?? 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * A NESTED CONTENT BLOCK. Used for a sub-fact inside a Panel, such as the
 * "in place" / "outstanding" pair on the compliance register.
 *
 * ⚠ IT GOES LIGHTER, NOT DARKER.
 *
 * The instinct for a block nested inside a card is to sink it, `--surface-
 * sunken`, the way a field is sunk. That is wrong here: a field is sunk
 * because it RECEIVES input and a well is the correct affordance for that. A
 * fact block does not receive anything, and stacking two dark steps, page
 * darker than raised darker than sunken, reads as the content getting buried
 * rather than organised.
 *
 * In a coloured-neumorphic system depth comes from LAYERS OF LIGHT, not from
 * layers of shade, so a block one level further from the page goes one step
 * CLOSER to the light source: `--surface-well`, lighter than the card it sits
 * in, with its own small soft lift rather than a border doing the separating.
 */
export function Well({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={['rounded-overlay p-4', className].filter(Boolean).join(' ')}
      style={{
        background: 'var(--surface-sunken)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02), 0 0 0 1px var(--border-subtle)',
      }}
    >
      {children}
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
      <dt className="t-eyebrow text-[var(--text-tertiary)]">{k}</dt>
      <dd className="t-data mt-1.5" style={{ color: tone ?? 'var(--text-primary)' }}>
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
      className="rounded-card px-6 py-5"
      style={{
        background: 'white',
        boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
      }}
    >
      <div className="t-eyebrow text-[var(--text-tertiary)]">{label}</div>
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
      <p className="t-caption mt-2.5 text-[var(--text-tertiary)]">{note}</p>
    </div>
  );
}
