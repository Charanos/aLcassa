import type { Icon as TablerIcon } from '@tabler/icons-react';
import { IconTile, type IconTileTone } from '@/components/primitives/IconTile';
import { SkeletonBar } from '@/components/primitives/Skeleton';

/**
 * A row of stated facts that open a page — the claims the page exists to back.
 *
 * ⚠ EXTRACTED THE MOMENT A SECOND PAGE NEEDED IT, NOT AFTER A FOURTH HAD
 *   COPIED IT. The audit log opened with four claims (append-only, same
 *   transaction, newest entry, the window) and Admins opens with four of its
 *   own. Doc 22 found `Figure` in four drifted copies because nobody extracted
 *   it at the second; this is the second.
 *
 * ⚠ DIVIDERS ARE A 1PX GAP OVER A RULE-COLOURED GROUND. Every divider is exact
 * at one, two or four columns with no per-breakpoint border arithmetic —
 * the first version of the audit strip had a class list trying to work out
 * which cell needed a right border at which width.
 */
export function FactStrip({
  label,
  children,
}: {
  /** What the strip establishes, for a screen reader. */
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="grid gap-px overflow-clip rounded-card sm:grid-cols-2 xl:grid-cols-4"
      style={{
        background: 'var(--border-subtle)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
      }}
    >
      {children}
    </section>
  );
}

export function FactCell({
  icon,
  tone = 'neutral',
  label,
  value,
  note,
  source,
}: {
  icon: TablerIcon;
  /** Only where the fact IS a warning or a success; a neutral claim stays neutral. */
  tone?: IconTileTone;
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  /** A `DataSource` marker, when the cell's figure is live or designed. */
  source?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 p-6" style={{ background: 'var(--surface-raised)' }}>
      <IconTile icon={icon} size="sm" tone={tone} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p
            className="font-mono text-2xs tracking-[0.14em] uppercase"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {label}
          </p>
          {source}
        </div>
        <p
          className="mt-2"
          style={{ font: '500 var(--type-lede)/1.25 var(--font-ui)', color: 'var(--text-primary)' }}
        >
          {value}
        </p>
        {note ? (
          <p
            className="t-caption mt-1.5"
            style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
          >
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function FactStripSkeleton({ cells = 4 }: { cells?: number }) {
  return (
    <div
      aria-hidden
      className="grid gap-px overflow-clip rounded-card sm:grid-cols-2 xl:grid-cols-4"
      style={{ background: 'var(--border-subtle)', border: '1px solid var(--border-subtle)' }}
    >
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="flex gap-4 p-6" style={{ background: 'var(--surface-raised)' }}>
          <SkeletonBar width={28} height={28} radius="rounded-panel" />
          <div className="flex-1">
            <SkeletonBar width={96} height={10} />
            <SkeletonBar width="62%" height={18} className="mt-2" />
            <SkeletonBar width="88%" height={11} className="mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
