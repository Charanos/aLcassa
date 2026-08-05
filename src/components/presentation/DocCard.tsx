import Link from 'next/link';
import { IconArrowUpRight, IconExternalLink } from '@tabler/icons-react';

/**
 * A document in the index. It is a link, so it looks like something you open
 * rather than something you read: the number in mono at the left in the
 * drafting-sheet idiom, the title, what it settles, and where it came from.
 *
 * The hover state shifts the border and the ground, and NOTHING MOVES. 03 §7:
 * hover on a row or card is a border and background shift over 140ms, never a
 * lift and never a translate. This surface will be scrolled past repeatedly in
 * a meeting, and anything that animates on arrival becomes a tax by the second
 * pass.
 */

export function DocCard({
  n,
  title,
  settles,
  source,
  href,
  external,
  band,
}: {
  n: string;
  title: string;
  settles: string;
  source: string;
  href: string;
  external?: boolean;
  band?: string;
}) {
  const Icon = external ? IconExternalLink : IconArrowUpRight;

  const content = (
    <>
      <span
        className="t-data shrink-0 tabular-nums"
        style={{ color: 'var(--copper-ink)' }}
        aria-hidden
      >
        {n}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="t-panel text-[var(--ink-primary)]">{title}</span>
          {band ? <span className="t-eyebrow text-[var(--ink-faint)]">{band}</span> : null}
        </span>
        <span className="t-compact mt-1 block text-[var(--ink-secondary)]">{settles}</span>
        <span className="t-caption mt-2 block text-[var(--ink-tertiary)]">{source}</span>
      </span>

      <Icon
        size={16}
        stroke={1.5}
        aria-hidden
        className="mt-1 shrink-0 text-[var(--ink-faint)] group-hover:text-[var(--copper-ink)]"
      />
    </>
  );

  const className =
    'group flex gap-4 rounded-panel border p-4 transition-colors duration-[var(--motion-fade)] hover:border-[var(--copper-rule)] hover:bg-[var(--copper-tint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]';

  const style = { borderColor: 'var(--rule-base)', background: 'var(--surface-raised)' };

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} style={style}>
        {content}
        <span className="visually-hidden">, opens in a new tab</span>
      </a>
    );
  }

  return (
    <Link href={href} className={className} style={style}>
      {content}
    </Link>
  );
}
