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
      className="flex items-center gap-4 rounded-[12px] px-4 py-4"
      style={{
        background: 'white',
        boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
      }}
    >
      <Bone className="h-4 shrink-0" style={{ width: 96, background: 'var(--surface-inset)' }} />
      <Bone className="h-4 flex-1" style={{ width: '70%', background: 'var(--surface-inset)' }} />
      <Bone className="h-5 shrink-0 rounded-full" style={{ width: 64, background: 'var(--surface-inset)' }} />
    </div>
  );
}

/** A panel: title plus two or three lines of varying width, matching Panel's
 *  own padding so the swap-in is dimensionally identical. */
export function SkeletonPanel({ lines = 3 }: { lines?: number }) {
  const widths = [88, 72, 60, 94, 66].slice(0, Math.max(1, lines));

  return (
    <div
      className="rounded-[16px] p-5"
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
      className="rounded-[16px] p-5"
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
