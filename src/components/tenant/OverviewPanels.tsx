import Link from 'next/link';
import {
  IconBrandWhatsapp,
  IconCircleCheck,
  IconMail,
  IconMessage2,
  IconWorld,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { EmptyState } from '@/components/primitives/EmptyState';
import type { ChannelStatus, QueueItem, UsageMeter } from '@/lib/tenant/data';

/**
 * The three panels below the overview's chart: what is waiting on a person,
 * which channels are carrying traffic, and how much of the plan is spent.
 *
 * They share one shell — a bordered, raised card with a mono eyebrow and an
 * optional action on the right — because the design gives all three the same
 * frame and only the body differs. Extracting the shell keeps that promise
 * enforceable rather than repeated in three places and drifting.
 */

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section
      data-slot="panel"
      aria-label={title}
      className="overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
      style={{ boxShadow: 'var(--glass-highlight), var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 pt-[15px] pb-[13px]">
        <h2 className="t-eyebrow uppercase" style={{ color: 'var(--text-tertiary)' }}>
          {title}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="t-compact transition-colors"
            style={{ color: 'var(--text-action)' }}
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/* ── Needs a person ───────────────────────────────────────────────────── */

/**
 * ⚠ THE EMPTY STATE HERE IS A SUCCESS, NOT AN ABSENCE. An empty queue means
 * the assistant closed everything, which is the product working — so it reads
 * as an achievement rather than the usual "nothing to show" apology.
 */
export function QueuePanel({ items, total }: { items: QueueItem[]; total: number }) {
  return (
    <Panel
      title="Needs a person"
      action={total > 0 ? { label: `All ${total}`, href: '/app/inbox' } : undefined}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={IconCircleCheck}
          title="Nothing waiting"
          body="Every open conversation is with the assistant. Anything it escalates arrives here."
        />
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
              <Link
                href="/app/inbox"
                className="flex w-full items-center gap-3.5 px-5 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)]"
              >
                <span
                  className="t-micro grid size-[30px] shrink-0 place-items-center rounded-full"
                  style={{ background: 'var(--surface-inset)', color: 'var(--text-secondary)' }}
                  aria-hidden
                >
                  {item.initials}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="t-body truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="t-micro inline-flex h-[19px] shrink-0 items-center rounded-full px-[7px]"
                      style={{
                        background: 'var(--surface-inset)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {item.channel}
                    </span>
                  </span>
                  <span
                    className="t-compact mt-0.5 block truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {item.snippet}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span
                    className="t-data block"
                    style={{
                      color: item.hot ? 'var(--warning-fg)' : 'var(--text-secondary)',
                    }}
                  >
                    {item.wait}
                  </span>
                  <span
                    className="t-caption mt-0.5 block"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {item.reason}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── Channels ─────────────────────────────────────────────────────────── */

const CHANNEL_ICON: Record<ChannelStatus['kind'], TablerIcon> = {
  whatsapp: IconBrandWhatsapp,
  email: IconMail,
  web: IconWorld,
  sms: IconMessage2,
};

const CHANNEL_TONE = {
  good: 'var(--success-fg)',
  warn: 'var(--warning-fg)',
  danger: 'var(--danger-fg)',
} as const;

export function ChannelsPanel({ channels }: { channels: ChannelStatus[] }) {
  return (
    <Panel title="Channels" action={{ label: 'Manage', href: '/app/settings/credentials' }}>
      <ul>
        {channels.map((channel) => {
          const Icon = CHANNEL_ICON[channel.kind];
          const ink = CHANNEL_TONE[channel.tone];

          return (
            <li
              key={channel.key}
              className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-[18px] py-[11px] last:border-b-0"
            >
              <span
                className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-md)]"
                style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
              >
                <Icon size={16} stroke={1.5} aria-hidden />
              </span>

              <span className="min-w-0 flex-1">
                <span className="t-compact block truncate" style={{ color: 'var(--text-primary)' }}>
                  {channel.label}
                </span>
                <span className="t-micro block truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {channel.detail}
                </span>
              </span>

              {/* 03 §14. Hue is never alone — the dot carries the state, and
                  the word beside it repeats the same fact for a reader who
                  cannot separate the hues. */}
              <span
                className="t-micro inline-flex shrink-0 items-center gap-1.5"
                style={{ color: ink }}
              >
                <span className="size-1.5 rounded-full" style={{ background: ink }} aria-hidden />
                {channel.state}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ── This period ──────────────────────────────────────────────────────── */

export function MetersPanel({ meters }: { meters: UsageMeter[] }) {
  return (
    <Panel title="This period" action={{ label: 'Detail', href: '/app/settings/subscription' }}>
      <div className="px-[18px] pt-4 pb-[18px]">
        {meters.map((meter) => (
          <div key={meter.key} className="mb-3.5 last:mb-0">
            <p className="mb-1.5 flex items-baseline justify-between gap-2.5">
              <span className="t-compact" style={{ color: 'var(--text-primary)' }}>
                {meter.label}
              </span>
              <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                {meter.text}
              </span>
            </p>
            {/*
              The bar is decorative — the figure beside the label already
              states the value in text, so a second announcement would make a
              screen reader read every meter twice.
            */}
            <div
              className="h-[5px] overflow-hidden rounded-full"
              style={{ background: 'var(--surface-inset)' }}
              aria-hidden
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, meter.pct))}%`,
                  background: CHANNEL_TONE[meter.tone],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
