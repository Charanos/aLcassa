import { IconLoader2 } from '@tabler/icons-react';

/**
 * 03 §9. Copper stroke, 900ms rotation. Used inline (a button's own loading
 * state uses this internally, see Button.tsx) and standalone for a region
 * that is loading with no known shape to skeleton against. 03 §15: under
 * 200ms, nothing; 200ms to 1s with no known shape, this with a label.
 */
export type SpinnerProps = {
  size?: 'sm' | 'md';
  /** Announced to a screen reader; visually hidden. A spinner with no label
   *  tells an assistive-technology user nothing is happening at all. */
  label?: string;
};

const SIZES = { sm: 16, md: 24 } as const;

export function Spinner({ size = 'md', label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center">
      <IconLoader2
        size={SIZES[size]}
        stroke={1.5}
        aria-hidden
        className="animate-spin motion-reduce:animate-none"
        style={{ color: 'var(--copper-solid)', animationDuration: '900ms' }}
      />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

/**
 * A labelled inline wait state for a region with no known shape to skeleton
 * against: a search result count, a saving indicator, a background job.
 * 03 §15.
 */
export function InlineLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" className="flex items-center gap-2.5">
      <Spinner size="sm" label="" />
      <span className="t-compact text-[var(--ink-tertiary)]">{label}</span>
    </div>
  );
}
