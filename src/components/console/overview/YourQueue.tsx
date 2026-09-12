import Link from 'next/link';
import {
  IconActivityHeartbeat,
  IconCircleCheck,
  IconClock,
  IconCreditCard,
  IconPlayerPause,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { SectionHeading } from '../Surface';
import type { QueueItem, QueueSeverity } from '@/lib/console/data';

const SEVERITY: Record<
  QueueSeverity,
  { rail: string; chipBg: string; chipInk: string; tagBg: string; tagInk: string; icon: TablerIcon }
> = {
  danger: {
    rail: 'var(--danger-fg)',
    chipBg: 'var(--danger-bg)',
    chipInk: 'var(--danger-fg)',
    tagBg: 'var(--danger-bg)',
    tagInk: 'var(--danger-fg)',
    icon: IconCreditCard,
  },
  warning: {
    rail: 'var(--warning-fg)',
    chipBg: 'var(--warning-bg)',
    chipInk: 'var(--warning-fg)',
    tagBg: 'var(--warning-bg)',
    tagInk: 'var(--warning-fg)',
    icon: IconActivityHeartbeat,
  },
  info: {
    rail: 'var(--blue-400)',
    chipBg: 'var(--blue-50)',
    chipInk: 'var(--blue-500)',
    tagBg: 'var(--surface-inset)',
    tagInk: 'var(--text-secondary)',
    icon: IconClock,
  },
  inert: {
    rail: 'var(--ink-400)',
    chipBg: 'var(--surface-inset)',
    chipInk: 'var(--text-tertiary)',
    tagBg: 'var(--surface-inset)',
    tagInk: 'var(--text-tertiary)',
    icon: IconPlayerPause,
  },
};

export function QueueCard({ item }: { item: QueueItem }) {
  const s = SEVERITY[item.severity];
  const Icon = s.icon;

  return (
    <article className="group relative transition-all duration-400">
      <div
        className="pointer-events-none absolute -inset-x-3 -inset-y-1.5 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'var(--surface-raised)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col py-3">
        <div className="flex items-center gap-3">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-105"
            style={{
              background: s.chipBg,
              color: s.chipInk,
              boxShadow: `0 2px 8px ${s.chipBg}`,
            }}
            aria-hidden
          >
            <Icon size={15} stroke={2} />
          </span>
          <Link
            href={`/platform/tenants/${item.slug}`}
            className="min-w-0 flex-1 truncate transition-colors hover:text-[var(--text-action)]"
            style={{
              font: '600 15.5px/1.35 var(--font-ui)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {item.name}
          </Link>

          <span
            className="inline-flex h-5.5 shrink-0 items-center rounded-full px-2.5 whitespace-nowrap"
            style={{
              background: s.tagBg,
              color: s.tagInk,
              font: '600 10.5px/1 var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {item.tag}
          </span>
        </div>

        <p
          className="mt-2.5 pl-11 text-[13.5px] leading-relaxed opacity-90"
          style={{ color: 'var(--text-secondary)', maxWidth: '80ch', textWrap: 'pretty' }}
        >
          {item.detail}
        </p>

        <div className="mt-4 pl-11 flex flex-wrap items-center gap-3">
          <Link
            href={item.primaryHref}
            className="t-compact inline-flex h-8 cursor-pointer items-center justify-center rounded-lg px-4 whitespace-nowrap transition-all duration-300 hover:brightness-110"
            style={{
              background: 'var(--blue-500)',
              color: '#ffffff',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25), inset 0 1px 1px rgba(255,255,255,0.2)',
            }}
          >
            {item.primaryLabel}
          </Link>
          <Link
            href={`/platform/tenants/${item.slug}`}
            className="t-compact inline-flex h-8 cursor-pointer items-center rounded-lg px-3.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
            style={{
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}
          >
            Open workspace
          </Link>
          <span className="flex-1" />
          <span
            className="whitespace-nowrap transition-opacity duration-300 group-hover:opacity-100 opacity-60"
            style={{ font: '500 11.5px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
          >
            {item.meta}
          </span>
        </div>
      </div>
    </article>
  );
}

export function YourQueue({
  queue,
  restingCount,
}: {
  queue: QueueItem[];
  restingCount: number;
}) {
  return (
    <section>
      <SectionHeading title="Your queue" note="Ordered by what it costs to ignore" />

      <div className="grid gap-4">
        {queue.map((item) => (
          <QueueCard key={item.id} item={item} />
        ))}
      </div>

      <div
        className="group relative mt-6 flex items-center gap-3.5 px-3 py-3 transition-colors duration-300 hover:bg-[var(--surface-inset)]"
        style={{ borderRadius: '12px' }}
      >
        <div
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full opacity-20 blur-md transition-opacity duration-500 group-hover:opacity-40"
          style={{ background: 'var(--success-fg)' }}
        />
        <div className="relative flex shrink-0 items-center justify-center">
          <IconCircleCheck
            size={18}
            stroke={2}
            className="relative z-10"
            style={{ color: 'var(--success-fg)' }}
            aria-hidden
          />
        </div>
        <p
          className="t-compact relative z-10 flex-1 font-medium"
          style={{ color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}
        >
          The other{' '}
          <span className="font-mono text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {restingCount}
          </span>{' '}
          workspaces are inside every limit, paid up, and active in the last seven days.
        </p>
      </div>
    </section>
  );
}
