import {
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconMessage,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';

/**
 * The hero's visual, in the drafting-sheet idiom rather than a screenshot.
 *
 * 03 §20 forbids a mock inbox behind a "coming soon" overlay, but that rule
 * targets `/app/inbox`: a designed surface pretending to be a working feature.
 * This is neither a screenshot nor a mock of the product. It is a SCHEMATIC,
 * exactly the kind of explanatory drawing a technical document uses to show
 * how something is wired, which is the same register as the rest of the
 * system. Four channels, not yet connected, converging through one conduit
 * into a workspace that already exists.
 *
 * Fixed pixel geometry rather than a responsive one, because it renders at a
 * single width tier only, `lg` and above, the same pattern the access screens'
 * aside already uses. Below `lg` it is absent rather than squeezed.
 */

const CHANNELS: Array<{ icon: TablerIcon; label: string; y: number }> = [
  { icon: IconBrandWhatsapp, label: 'WhatsApp', y: 0 },
  { icon: IconBrandInstagram, label: 'Instagram', y: 96 },
  { icon: IconBrandMessenger, label: 'Messenger', y: 192 },
  { icon: IconMessage, label: 'Web chat', y: 288 },
];

const WIDTH = 460;
const HEIGHT = 392;
const NODE_W = 172;
const NODE_H = 56;
const TARGET_X = 268;
const TARGET_Y = 194;
const TARGET_W = 172;
const TARGET_H = 84;
const TARGET_CENTER_Y = TARGET_Y + TARGET_H / 2;

export function HeroDiagram() {
  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }} aria-hidden>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} fill="none" className="absolute inset-0">
        {CHANNELS.map((channel) => {
          const startY = channel.y + NODE_H / 2;
          return (
            <path
              key={channel.label}
              d={`M${NODE_W},${startY} C ${NODE_W + 56},${startY} ${TARGET_X - 40},${TARGET_CENTER_Y} ${TARGET_X},${TARGET_CENTER_Y}`}
              stroke="var(--rule-strong)"
              strokeWidth={1.5}
              fill="none"
            />
          );
        })}
        {/* The convergence point, where the four lines become one, which is
            the whole idea the mark itself draws: a conduit passing through a
            boundary. */}
        <circle cx={TARGET_X} cy={TARGET_CENTER_Y} r={3.5} fill="var(--copper-solid)" />
      </svg>

      {CHANNELS.map((channel) => (
        <div
          key={channel.label}
          className="absolute flex items-center gap-3 rounded-panel border px-4"
          style={{
            left: 0,
            top: channel.y,
            width: NODE_W,
            height: NODE_H,
            background: 'var(--surface-raised)',
            borderColor: 'var(--rule-soft)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <channel.icon size={18} stroke={1.5} className="shrink-0 text-[var(--ink-tertiary)]" />
          <div className="min-w-0">
            <div className="t-compact truncate text-[var(--ink-primary)]">{channel.label}</div>
            <div className="t-eyebrow text-[var(--ink-faint)]">Next phase</div>
          </div>
        </div>
      ))}

      {/* The one node that is already real. Inverted and in copper, the same
          structural signal the console header uses to say "this one is
          different". */}
      <div
        className="absolute flex items-center gap-3 rounded-panel border px-4"
        style={{
          left: TARGET_X,
          top: TARGET_Y,
          width: TARGET_W,
          height: TARGET_H,
          background: 'var(--surface-invert)',
          borderColor: 'var(--copper-rule)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <Mark size={22} tone="inverse" />
        <div>
          <div className="t-compact" style={{ color: 'var(--ink-inverse)' }}>
            Your workspace
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="relative flex size-1.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full motion-reduce:animate-none"
                style={{ background: 'var(--verdigris-ink)', opacity: 0.55 }}
              />
              <span
                className="relative inline-flex size-1.5 rounded-full"
                style={{ background: 'var(--verdigris-ink)' }}
              />
            </span>
            <span className="t-eyebrow" style={{ color: 'var(--ink-inverse)', opacity: 0.65 }}>
              Live now
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
