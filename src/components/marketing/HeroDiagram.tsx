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
 * 03 §20 forbids a mock inbox behind a "coming soon" overlay. That rule
 * targets the placeholder surfaces, a screen pretending a feature exists. This
 * is a SCHEMATIC, the explanatory drawing a technical document uses to show
 * how something is wired, which is the register the whole system is drawn in.
 *
 * ⚠ THE MOTION MEANS SOMETHING NOW, WHICH IT DID NOT BEFORE.
 *
 * The previous version put `animate-pulse` on the connector paths and
 * `animate-ping` on the convergence point. Both are ambient throbs: they draw
 * the eye without telling it anything, and a reader watching a line fade in
 * and out learns nothing about what the line is for.
 *
 * The paths now carry a DIRECTIONAL DASH FLOW, travelling left to right, from
 * the channels toward the core. That is the one true statement this diagram
 * makes: messages arrive from four places and are carried into one workspace.
 * The animation is the sentence, not decoration on top of it. Each path is
 * offset in time so the four read as independent streams rather than a
 * marching band.
 *
 * ⚠ ALSO CORRECTED HERE, against 03 §5, §6 and §20:
 *
 *   · `font-semibold` / `font-bold` / `font-medium` removed. This system has
 *     ONE WEIGHT and `font-synthesis: none`, so those classes were changing
 *     nothing while implying a hierarchy the type cannot express.
 *   · `rounded-2xl` / `rounded-3xl` / `rounded-xl` replaced with the radius
 *     tokens. 24px corners on a drafting sheet read as a different product.
 *   · Hardcoded `rgba(0,0,0,…)` shadows replaced with `--shadow-card`.
 *   · `text-xs` / `text-[10px]` removed where they were fighting the `font`
 *     shorthand already set by `t-compact` and `t-eyebrow`.
 *   · The two floating cards at the bottom were overlapping each other. They
 *     are laid out on the same grid as everything else now.
 */

const CHANNELS: Array<{ icon: TablerIcon; label: string; y: number; tone: string }> = [
  { icon: IconBrandWhatsapp, label: 'WhatsApp', y: 8, tone: 'verdigris' },
  { icon: IconBrandInstagram, label: 'Instagram', y: 90, tone: 'copper' },
  { icon: IconBrandMessenger, label: 'Messenger', y: 172, tone: 'slate' },
  { icon: IconMessage, label: 'Web chat', y: 254, tone: 'ochre' },
];

const WIDTH = 520;
const HEIGHT = 430;
const NODE_W = 168;
const NODE_H = 60;

const CORE_X = 296;
const CORE_Y = 132;
const CORE_W = 208;
const CORE_H = 104;
const CORE_MID = CORE_Y + CORE_H / 2;

export function HeroDiagram() {
  return (
    <div 
      className="relative select-none origin-top lg:origin-top-left scale-[0.6] min-[400px]:scale-[0.7] sm:scale-75 md:scale-90 lg:scale-100 transition-transform duration-500" 
      style={{ 
        width: WIDTH, 
        height: HEIGHT, 
        marginBottom: 'calc(-1 * (1 - clamp(0.6, 100vw / 520, 1)) * 430px)', // Pull up elements below to avoid whitespace
        marginLeft: 'calc(-1 * (1 - clamp(0.6, 100vw / 520, 1)) * 520px / 2)', // Center correctly on small screens
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
          const d = `M ${NODE_W} ${startY} C ${NODE_W + 64} ${startY}, ${CORE_X - 52} ${CORE_MID}, ${CORE_X} ${CORE_MID}`;

          return (
            <g key={channel.label}>
              {/* The conduit itself: a still hairline, always present. */}
              <path d={d} stroke="var(--rule-base)" strokeWidth={1.5} fill="none" />

              {/* What travels through it. A short dash sliding along the path,
                  left to right, so direction is unambiguous. */}
              <path
                d={d}
                stroke={`var(--${channel.tone}-solid)`}
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

        {/* Where the four become one. Static: the convergence is a fact about
            the wiring, not an event that needs announcing on a loop. */}
        <circle cx={CORE_X} cy={CORE_MID} r={4} fill="var(--copper-solid)" />
        {/* Additional decorative ring to anchor the core */}
        <circle cx={CORE_X} cy={CORE_MID} r={12} stroke="var(--copper-rule)" strokeWidth={1} fill="none" opacity={0.5} />
      </svg>

      {/* ── The four channels ──────────────────────────────────────────── */}
      {CHANNELS.map((channel) => (
        <div
          key={channel.label}
          className="absolute z-10 flex items-center gap-3 rounded-panel border px-3.5"
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
          <span
            className="grid size-9 shrink-0 place-items-center rounded-chip border"
            style={{ background: 'var(--surface-sunken)', borderColor: 'var(--rule-soft)' }}
          >
            <channel.icon size={18} stroke={1.5} style={{ color: `var(--${channel.tone}-ink)` }} />
          </span>
          <span className="min-w-0">
            <span className="t-compact block truncate text-[var(--ink-primary)]">
              {channel.label}
            </span>
            <span className="t-eyebrow block text-[var(--ink-tertiary)]">Coming soon</span>
          </span>
        </div>
      ))}

      {/* ── The core. The one node that is already real. ───────────────── */}
      <div
        className="absolute z-20 flex flex-col justify-between rounded-panel border p-4"
        style={{
          left: CORE_X,
          top: CORE_Y,
          width: CORE_W,
          height: CORE_H,
          background: 'var(--surface-invert)',
          borderColor: 'var(--copper-rule)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-2.5">
            <Mark size={22} tone="inverse" />
            <span className="t-chip" style={{ color: 'var(--ink-inverse)' }}>
              Your workspace
            </span>
          </span>
          <IconLock size={15} stroke={1.5} style={{ color: 'var(--copper-rule)' }} />
        </div>

        <div
          className="flex items-center gap-2 border-t pt-2.5"
          style={{ borderColor: 'color-mix(in oklab, var(--ink-inverse) 15%, transparent)' }}
        >
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: 'var(--verdigris-solid)' }}
          />
          <span className="t-eyebrow" style={{ color: 'var(--ink-inverse)', opacity: 0.75 }}>
            Live and isolated
          </span>
        </div>
      </div>

      {/* ── Two supporting facts. Positioned on an explicit grid so they
             cannot collide the way the previous three did. ──────────────── */}
      <FactCard
        icon={IconActivity}
        tone="verdigris"
        label="Assistant rules"
        value="Live in under 5 seconds"
        left={CORE_X + 24}
        top={16}
      />

      <FactCard
        icon={IconKey}
        tone="copper"
        label="API credentials"
        value="Shown once, never again"
        left={CORE_X - 36}
        top={HEIGHT - 92}
      />
    </div>
  );
}

function FactCard({
  icon: Icon,
  tone,
  label,
  value,
  left,
  top,
}: {
  icon: TablerIcon;
  tone: 'copper' | 'verdigris';
  label: string;
  value: string;
  left: number;
  top: number;
}) {
  return (
    <div
      className="absolute z-20 flex items-center gap-2.5 rounded-panel border px-3 py-2"
      style={{
        left,
        top,
        background: 'var(--surface-raised)',
        borderColor: `var(--${tone}-rule)`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <Icon size={15} stroke={1.5} style={{ color: `var(--${tone}-ink)` }} />
      <span>
        <span className="t-eyebrow block text-[var(--ink-tertiary)]">{label}</span>
        <span className="t-compact block whitespace-nowrap" style={{ color: `var(--${tone}-ink)` }}>
          {value}
        </span>
      </span>
    </div>
  );
}
