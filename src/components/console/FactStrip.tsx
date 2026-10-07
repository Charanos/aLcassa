import { Children } from 'react';
import type { Icon as TablerIcon } from '@tabler/icons-react';
import type { IconTileTone } from '@/components/primitives/IconTile';

const columns = [
  'grid-cols-1',
  'min-[360px]:grid-cols-2',
  'min-[360px]:grid-cols-2 lg:grid-cols-3',
  'min-[360px]:grid-cols-2 lg:grid-cols-4',
];

/** Shared inverted summary band. Artwork is decorative; facts remain selectable text. */
export function FactStrip({
  label,
  children,
  maxColumns = 4,
}: {
  label: string;
  children: React.ReactNode;
  maxColumns?: 2 | 3 | 4;
}) {
  const count = Children.toArray(children).length;
  return (
    <section
      aria-label={label}
      className={`console-fact-strip grid ${columns[Math.min(maxColumns, Math.max(1, count)) - 1]}`}
    >
      {children}
    </section>
  );
}

const toneColor: Record<IconTileTone, string> = {
  neutral: 'var(--chrome-fg-muted)',
  brand: 'var(--chrome-brand)',
  info: 'var(--chrome-info)',
  success: 'var(--chrome-success)',
  warning: 'var(--chrome-warning)',
  danger: 'var(--chrome-danger)',
};

export function FactCell({
  icon: Icon,
  tone = 'neutral',
  label,
  value,
  note,
  source,
}: {
  icon: TablerIcon;
  tone?: IconTileTone;
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  source?: React.ReactNode;
}) {
  return (
    <div className="console-fact-cell">
      <Icon className="console-fact-art" size={76} stroke={1} aria-hidden />
      <div className="relative z-10 flex h-full min-w-0 flex-col">
        <div className="flex items-start gap-2.5">
          <Icon
            size={16}
            stroke={1.5}
            className="mt-0.5 shrink-0"
            style={{ color: toneColor[tone] }}
            aria-hidden
          />
          <p className="t-compact" style={{ color: 'var(--chrome-fg-muted)' }}>
            {label}
          </p>
        </div>
        <div className="console-fact-value mt-4">{value}</div>
        {note ? (
          <p
            className="t-caption mt-2 max-w-[32ch] text-pretty"
            style={{ color: 'var(--chrome-fg-muted)' }}
          >
            {note}
          </p>
        ) : null}
        {source ? <div className="console-fact-source mt-3">{source}</div> : null}
      </div>
    </div>
  );
}

export function FactStripSkeleton({ cells = 4 }: { cells?: number }) {
  return (
    <div
      aria-hidden
      className={`console-fact-strip grid ${columns[Math.min(4, Math.max(1, cells)) - 1]}`}
    >
      {Array.from({ length: cells }).map((_, index) => (
        <div className="console-fact-cell" key={index}>
          <div className="h-3 w-28 rounded-full bg-white/15" />
          <div className="mt-5 h-7 w-24 rounded-panel bg-white/20" />
          <div className="mt-3 h-3 w-4/5 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}
