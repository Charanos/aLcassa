/**
 * 03 §15. Skeleton rules, verbatim:
 *
 *   mirror the real component's structure, vary text widths 60% to 95%,
 *   opacity pulse between 0.55 and 1 over 1400ms with NO SHIMMER SWEEP,
 *   static at 0.7 under reduced motion, never nested, never more than one
 *   screenful, identical dimensions to the real thing, `aria-busy` on the
 *   container.
 *
 * "No shimmer sweep" is the specific anti-pattern this exists to avoid: a
 * moving gradient reads as a loading BAR filling up, which implies a known
 * duration this system cannot promise. A pulse reads as "waiting", which is
 * the honest claim.
 */

const PULSE =
  'animate-[skeleton-pulse_1400ms_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-70';

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      className={['block rounded-chip', PULSE, className].filter(Boolean).join(' ')}
      style={{ background: 'var(--surface-sunken)', ...style }}
    />
  );
}

export type SkeletonProps = { className?: string; 'aria-label'?: string };

/**
 * A bar of any size — the one shape a structural skeleton needs that the
 * named ones above do not cover.
 *
 * ⚠ EXPORTED BECAUSE `Bone` WAS NOT, AND SIX FILES WROTE THEIR OWN. Every
 * loading state rebuilt in doc 21 declared a local `Bar` (and one an
 * `Invert`, one a `HeadroomBar`, one a `ChartBlock`) — the same span, the
 * same pulse, the same reduced-motion fallback, six times. That is the
 * un-extracted-primitive pattern doc 22 names, written by the pass that named
 * it. This is the one they now use.
 *
 * `inverse` is for the dark chrome slabs: `--surface-sunken` is invisible on
 * obsidian, so the bar is lightened against the slab instead of tinted.
 */
export function SkeletonBar({
  width = '100%',
  height = 12,
  radius = 'rounded-chip',
  inverse = false,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?:
    | 'rounded-bar'
    | 'rounded-chip'
    | 'rounded-panel'
    | 'rounded-overlay'
    | 'rounded-card'
    | 'rounded-full';
  inverse?: boolean;
  className?: string;
}) {
  /* Its own span rather than `Bone`, which hard-codes `rounded-chip`: two
     radius classes on one element resolve by stylesheet order, not intent. */
  return (
    <span
      aria-hidden
      className={['block shrink-0', radius, PULSE, className].filter(Boolean).join(' ')}
      style={{
        width,
        height,
        /* ⚠ `--surface-inset`, NOT `Bone`'S `--surface-sunken`. Sunken is the
           ground of an `elevated` Panel, so a sunken bar inside one is the
           same colour as the panel behind it — invisible. Every band skeleton
           that predates this worked around it with an `!bg` override; inset
           reads on the page ground and inside a panel alike. */
        background: inverse ? 'rgba(255, 255, 255, 0.07)' : 'var(--surface-inset)',
      }}
    />
  );
}

/** One line of body text at a plausible width, per the 60–95% rule. */
export function SkeletonText({ width = 82, className }: { width?: number; className?: string }) {
  return (
    <Bone className={['h-4', className].filter(Boolean).join(' ')} style={{ width: `${width}%` }} />
  );
}

/** A rectangular region: an image, a chart, a map. */
export function SkeletonBlock({
  height = 160,
  className,
}: {
  height?: number | string;
  className?: string;
}) {
  return <Bone className={['w-full', className].filter(Boolean).join(' ')} style={{ height }} />;
}

/** A data-grid row: mirrors DataList's card shape, not a table `<tr>`, since
 *  that is what actually loads on this surface. */
export function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-4 rounded-overlay px-4 py-4"
      style={{
        background: 'var(--surface-raised)',
        boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
      }}
    >
      <Bone className="h-4 shrink-0" style={{ width: 96, background: 'var(--surface-inset)' }} />
      <Bone className="h-4 flex-1" style={{ width: '70%', background: 'var(--surface-inset)' }} />
      <Bone
        className="h-5 shrink-0 rounded-full"
        style={{ width: 64, background: 'var(--surface-inset)' }}
      />
    </div>
  );
}

/** A panel: title plus two or three lines of varying width, matching Panel's
 *  own padding so the swap-in is dimensionally identical. */
export function SkeletonPanel({ lines = 3 }: { lines?: number }) {
  const widths = [88, 72, 60, 94, 66].slice(0, Math.max(1, lines));

  return (
    <div
      className="rounded-card p-5"
      style={{
        background: 'var(--surface-sunken)',
        boxShadow: 'var(--shadow-sm), var(--glass-highlight), 0 0 0 1px var(--border-subtle)',
      }}
    >
      <Bone className="h-3.5" style={{ width: 128, background: 'var(--surface-inset)' }} />
      <div className="mt-4 grid gap-2.5">
        {widths.map((width, index) => (
          <SkeletonText key={index} width={width} className="!bg-[var(--surface-inset)]" />
        ))}
      </div>
    </div>
  );
}

/** A `Stat`/`StatTile`'s shape: an eyebrow label and a large data value. */
export function SkeletonMetric() {
  return (
    <div
      className="rounded-card p-5"
      style={{
        background: 'var(--surface-sunken)',
        boxShadow: 'var(--shadow-sm), var(--glass-highlight), 0 0 0 1px var(--border-subtle)',
      }}
    >
      <Bone className="h-3" style={{ width: 88, background: 'var(--surface-inset)' }} />
      <Bone className="mt-3 h-8" style={{ width: 64, background: 'var(--surface-inset)' }} />
    </div>
  );
}

/** Mirrors `ConsoleHeader`'s shape: an eyebrow line, a title line, and
 *  (optionally) an action-sized bone at the trailing edge — so a
 *  `loading.tsx` never shifts the header's own height when the real one
 *  swaps in. */
export function SkeletonHeader({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
      <div className="min-w-0 flex-1">
        <Bone className="h-3" style={{ width: 128 }} />
        <Bone className="mt-3 h-7" style={{ width: 256 }} />
      </div>
      {withAction ? <Bone className="h-8.5 shrink-0" style={{ width: 132 }} /> : null}
    </div>
  );
}

/**
 * The container. `aria-busy` here, once, rather than on every bone: a screen
 * reader only needs to be told the REGION is busy, not that each rectangle
 * inside it is.
 */
export function SkeletonGroup({
  children,
  label = 'Loading',
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}

/* ── The shapes the console actually loads ─────────────────────────────────
 *
 * ⚠ EVERYTHING ABOVE THIS LINE IS GENERIC, AND FOUR CONSOLE SCREENS WERE
 *   STANDING IN FOR THEIR REAL LAYOUTS WITH IT.
 *
 * 03 §15 asks for "identical dimensions to the real thing" and the reason is
 * not tidiness: a skeleton of the wrong shape is a layout shift with extra
 * steps, and it costs more than no skeleton at all, because the reader has
 * already started reading when the page jumps. Revenue drew four small tiles
 * and two blocks where the real screen has a 300px dark slab, two section
 * headings, a movement band and two different chart grids — so the page more
 * than doubled in height on arrival, every time.
 *
 * These four are the shapes those screens are actually made of.
 */

/**
 * The inverted stat ribbon: workspaces, revenue's KPI slab, and the four
 * tenant-detail tabs all open with one.
 *
 * ⚠ IT IS DARK, BECAUSE THE THING IT REPLACES IS DARK. A light skeleton
 * standing in for the inverted slab makes the swap a flash from near-white to
 * near-black across a third of the viewport — which is worse than the layout
 * shift it was drawn to prevent, and is the one skeleton failure a reader
 * physically cannot ignore. The bones sit on the chrome tier for the same
 * reason the slab's own text does.
 */
export function SkeletonRibbon({ stats = 4 }: { stats?: number }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-card sm:flex-row"
      style={{
        background: 'var(--invert-card-bg)',
        border: '1px solid var(--invert-card-border)',
        boxShadow: 'var(--invert-card-shadow)',
      }}
    >
      {Array.from({ length: stats }).map((_, i) => (
        <div key={i} className="relative flex-1 p-5 sm:p-6">
          <Bone className="h-2.5" style={{ width: 96, background: 'var(--chrome-rule-strong)' }} />
          <Bone
            className="mt-3.5 h-7"
            style={{ width: 72, background: 'var(--chrome-active-bg)' }}
          />
          <Bone className="mt-2.5 h-2.5" style={{ width: 128, background: 'var(--chrome-rule)' }} />
          {i < stats - 1 ? (
            <div
              className="absolute top-6 right-0 bottom-6 hidden w-px sm:block"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)',
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * The filter bar above a list: search box, status chips, view toggle.
 *
 * Omitting it was worth ~56px of shift on the workspaces screen — the search
 * box, its margin, and the chip row underneath — which lands exactly where the
 * reader's eye is going.
 */
export function SkeletonFilterBar({ chips = 5 }: { chips?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Bone className="h-[38px] w-full rounded-chip sm:max-w-sm" />
      <div className="flex items-center gap-2">
        {Array.from({ length: chips }).map((_, i) => (
          <Bone
            key={i}
            className="h-[30px] rounded-full"
            style={{ width: [72, 60, 84, 68, 76][i % 5] }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * A real table: a header rule and N rows inside the card that holds them.
 *
 * ⚠ NOT `SkeletonRow` REPEATED. That draws free-standing cards with their own
 * shadow and gap — the DataList shape, which is what the tenant app uses. The
 * console's lists are tables inside one rounded container with hairline
 * dividers, so a stack of cards is both the wrong height and the wrong number
 * of edges.
 */
export function SkeletonTable({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  const widths = [40, 64, 52, 72, 48, 60];
  return (
    <div
      className="overflow-hidden rounded-hero"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm), var(--glass-highlight)',
      }}
    >
      <div
        className="flex items-center gap-4 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Bone
            key={i}
            className={`h-2.5 ${i === 0 ? 'flex-1' : 'shrink-0'}`}
            style={{
              width: i === 0 ? undefined : widths[i % widths.length],
              background: 'var(--surface-inset)',
            }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 px-5 py-4"
          style={{ borderBottom: r === rows - 1 ? undefined : '1px solid var(--border-subtle)' }}
        >
          <Bone
            className="size-8 shrink-0 rounded-full"
            style={{ background: 'var(--surface-sunken)' }}
          />
          <Bone
            className="h-4 flex-1"
            style={{ maxWidth: `${[82, 68, 91, 74, 60, 86][r % 6]}%` }}
          />
          {Array.from({ length: Math.max(0, columns - 2) }).map((_, c) => (
            <Bone
              key={c}
              className="h-4 shrink-0"
              style={{
                width: widths[(r + c) % widths.length],
                background: 'var(--surface-sunken)',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * `SectionHeading`'s shape: the full-width hairline, then a display-sized
 * title with a note beneath it.
 *
 * Its `mt-24 mb-12` is a lot of vertical space to leave out of a skeleton —
 * roughly 150px per heading, and revenue has two of them.
 */
export function SkeletonSectionHeading({ align = 'left' }: { align?: 'left' | 'right' }) {
  return (
    <div className="mt-24 mb-12 w-full">
      <div
        aria-hidden
        className={`mb-6 h-px w-full ${
          align === 'right'
            ? 'bg-gradient-to-l from-[var(--border-strong)]/40 to-transparent'
            : 'bg-gradient-to-r from-[var(--border-strong)]/40 to-transparent'
        }`}
      />
      <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
        <Bone className="h-7" style={{ width: 232 }} />
        <Bone className="mt-3 h-3.5" style={{ width: 360 }} />
      </div>
    </div>
  );
}
