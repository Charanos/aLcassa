/**
 * One figure: a label, a right-aligned number, and an optional note beneath —
 * the row every "In the window" panel in the console is built from.
 *
 * ⚠ EXTRACTED FROM FOUR LOCAL COPIES THAT HAD ALREADY DRIFTED. Doc 22 §2.
 *
 *   `VolumeBand`     { label, value, note, tone: 'accent' }
 *   `MovementBand`   { label, value, note, tone: 'danger', strong }
 *   `ActorBand`      { label, value, note }
 *   `IsolationBand`  a fifth under another name, `Fact`, { label, value, muted }
 *
 * Same row, four opinions about its padding, its divider opacity and its type
 * size — one of them written as `fontSize: strong ? '20px' : '14px'`, a raw
 * pixel the lint rules could not see because it sat inside a conditional. The
 * third copy was written by hand-matching the first two, which is precisely
 * how the first two stopped matching each other.
 *
 * Stack them in a plain `grid`: the first loses its top rule and padding, so a
 * panel's first figure sits flush under the panel title.
 */
export type FigureTone = 'default' | 'accent' | 'warning' | 'danger' | 'success' | 'muted';

const TONE_INK: Record<FigureTone, string> = {
  default: 'var(--text-primary)',
  /* 03 §4a: one accent per surface. The figure that earns it is the one a
     reader came to the panel to check. */
  accent: 'var(--accent-mark-text)',
  warning: 'var(--warning-fg)',
  danger: 'var(--danger-fg)',
  success: 'var(--success-fg)',
  /* For an honest absence — "Not yet counted" — which must not look like a
     number that happens to be words. */
  muted: 'var(--text-tertiary)',
};

export function Figure({
  label,
  value,
  note,
  tone = 'default',
  strong = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: FigureTone;
  /** The panel's headline figure: one step larger, one weight heavier. */
  strong?: boolean;
}) {
  return (
    <div
      className="grid gap-1 border-t py-3.5 first:border-t-0 first:pt-0 last:pb-0"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <span className="t-compact min-w-0" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span
          className="shrink-0 text-right whitespace-nowrap tabular-nums"
          style={{
            font: `${strong ? 500 : 400} ${strong ? 'var(--type-panel)' : 'var(--type-lede)'}/1 var(--font-mono)`,
            letterSpacing: strong ? '-0.02em' : undefined,
            color: TONE_INK[tone],
          }}
        >
          {value}
        </span>
      </div>
      {note ? (
        <p className="t-caption m-0" style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
