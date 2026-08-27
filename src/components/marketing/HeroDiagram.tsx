import {
  IconActivity,
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconKey,
  IconLock,
  IconMessage,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';

/**
 * The hero schematic: four channels converging into one isolated workspace.
 *
 * Distinct channel identities with high-contrast, theme-adaptive vibrant icon tones:
 *   - WhatsApp: Emerald Green (#25D366 / --green-400)
 *   - Instagram: Sunset Rose / Ember (#E1306C / --orange-400)
 *   - Messenger: Sky / Royal Blue (#0084FF / --blue-400)
 *   - Web chat: Luminous Amber / Gold (#F59E0B / --amber-400)
 *   - Your Workspace: Crisp White background in Dark Mode, Deep Navy in Light Mode
 */
const CHANNELS: Array<{
  icon: TablerIcon;
  label: string;
  y: number;
  iconColorClass: string;
  iconBgClass: string;
  flowColor: string;
}> = [
  {
    icon: IconBrandWhatsapp,
    label: 'WhatsApp',
    y: 8,
    iconColorClass: 'text-success',
    iconBgClass: 'bg-emerald-50 border-success/60',
    flowColor: 'var(--green-400)',
  },
  {
    icon: IconBrandInstagram,
    label: 'Instagram',
    y: 90,
    iconColorClass: 'text-danger',
    iconBgClass: 'bg-rose-50 border-danger/60',
    flowColor: 'var(--orange-400)',
  },
  {
    icon: IconBrandMessenger,
    label: 'Messenger',
    y: 172,
    iconColorClass: 'text-[var(--blue-600)]',
    iconBgClass: 'bg-blue-50 border-[var(--blue-200)]/60',
    flowColor: 'var(--blue-400)',
  },
  {
    icon: IconMessage,
    label: 'Web chat',
    y: 254,
    iconColorClass: 'text-warning',
    iconBgClass: 'bg-amber-50 border-warning/60',
    flowColor: 'var(--amber-400)',
  },
];

const WIDTH = 490;
const HEIGHT = 420;
const NODE_W = 160;
const NODE_H = 58;

const CORE_X = 270;
const CORE_Y = 130;
const CORE_W = 204;
const CORE_H = 102;
const CORE_MID = CORE_Y + CORE_H / 2;

export function HeroDiagram() {
  return (
    <div
      className="relative origin-top scale-[0.6] transition-transform duration-500 select-none min-[400px]:scale-[0.7] sm:scale-75 md:scale-90 lg:origin-top-left lg:scale-100"
      style={{
        width: WIDTH,
        height: HEIGHT,
        marginBottom: 'calc(-1 * (1 - clamp(0.6, 100vw / 490, 1)) * 420px)',
        marginLeft: 'calc(-1 * (1 - clamp(0.6, 100vw / 490, 1)) * 490px / 2)',
      }}
      aria-hidden
    >
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        fill="none"
        className="pointer-events-none absolute inset-0 z-0"
      >
        {CHANNELS.map((channel, index) => {
          const startY = channel.y + NODE_H / 2;
          const d = `M ${NODE_W} ${startY} C ${NODE_W + 56} ${startY}, ${CORE_X - 44} ${CORE_MID}, ${CORE_X} ${CORE_MID}`;

          return (
            <g key={channel.label}>
              {/* The channel path: subtle architectural hairline */}
              <path d={d} stroke="var(--border-subtle)" strokeWidth={1.5} fill="none" />

              {/* Directional packet flow with channel signature accent */}
              <path
                d={d}
                stroke={channel.flowColor}
                strokeWidth={1.5}
                fill="none"
                strokeLinecap="round"
                strokeDasharray="16 150"
                className="hero-flow"
                style={{ animationDelay: `${index * 0.6}s` }}
              />
            </g>
          );
        })}

        {/* Convergence point */}
        <circle cx={CORE_X} cy={CORE_MID} r={4} fill="var(--accent-mark)" />
        <circle
          cx={CORE_X}
          cy={CORE_MID}
          r={12}
          stroke="var(--accent-mark)"
          strokeWidth={1}
          fill="none"
          opacity={0.4}
        />
      </svg>

      {/* ── The four channels ──────────────────────────────────────────── */}
      {CHANNELS.map((channel) => (
        <div
          key={channel.label}
          className="absolute z-10 flex items-center gap-3 rounded-panel border px-3 transition-shadow hover:shadow-md"
          style={{
            left: 0,
            top: channel.y,
            width: NODE_W,
            height: NODE_H,
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-chip border transition-colors ${channel.iconBgClass}`}
          >
            <channel.icon size={17} stroke={1.75} className={channel.iconColorClass} />
          </span>
          <span className="min-w-0">
            <span
              className="t-compact block truncate text-[13px] font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {channel.label}
            </span>
            <span
              className="t-eyebrow block text-[9.5px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Coming soon
            </span>
          </span>
        </div>
      ))}

      {/* ── The core: High-Contrast Inverted Card (Dark Navy on Light Mode, Crisp White on Dark Mode) ── */}
      <div
        className="absolute z-20 flex flex-col justify-between rounded-panel border p-3.5 shadow-xl transition-all"
        style={{
          left: CORE_X,
          top: CORE_Y,
          width: CORE_W,
          height: CORE_H,
          background: 'var(--workspace-card-bg)',
          color: 'var(--workspace-card-fg)',
          borderColor: 'var(--workspace-card-border)',
          boxShadow: 'var(--workspace-card-shadow)',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-2.5">
            <Mark size={20} tone="brand" />
            <span
              className="t-chip text-[11px] font-medium tracking-wider"
              style={{ color: 'var(--workspace-card-fg)' }}
            >
              YOUR WORKSPACE
            </span>
          </span>
          <IconLock size={15} stroke={2} style={{ color: 'var(--workspace-card-lock)' }} />
        </div>

        <div
          className="flex items-center gap-2 border-t pt-2"
          style={{ borderColor: 'color-mix(in oklab, var(--workspace-card-fg) 18%, transparent)' }}
        >
          <span
            aria-hidden
            className="size-2 shrink-0 animate-pulse rounded-full"
            style={{ background: 'var(--workspace-card-status)' }}
          />
          <span
            className="t-eyebrow text-[10px] font-normal tracking-wider"
            style={{ color: 'var(--workspace-card-fg)', opacity: 0.9 }}
          >
            LIVE AND ISOLATED
          </span>
        </div>
      </div>

      {/* ── Two supporting facts with Ember and Amber accents ──────────── */}
      <FactCard
        icon={IconActivity}
        iconColorClass="text-danger"
        label="Assistant rules"
        value="Live in under 5 seconds"
        left={CORE_X + 8}
        top={14}
      />

      <FactCard
        icon={IconKey}
        iconColorClass="text-warning"
        label="API credentials"
        value="Shown once, never again"
        left={CORE_X - 44}
        top={HEIGHT - 88}
      />
    </div>
  );
}

function FactCard({
  icon: Icon,
  iconColorClass,
  label,
  value,
  left,
  top,
}: {
  icon: TablerIcon;
  iconColorClass: string;
  label: string;
  value: string;
  left: number;
  top: number;
}) {
  return (
    <div
      className="absolute z-20 flex items-center gap-2.5 rounded-panel border px-3 py-1.5"
      style={{
        left,
        top,
        background: 'var(--surface-raised)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <Icon size={15} stroke={1.75} className={iconColorClass} aria-hidden />
      <span>
        <span className="t-eyebrow block text-[9.5px]" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </span>
        <span
          className="t-compact block text-[12.5px] font-medium whitespace-nowrap"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}
        </span>
      </span>
    </div>
  );
}
