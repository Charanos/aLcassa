import React, { useId } from 'react';
import {
  IconBrandWhatsappFilled,
  IconBrandInstagram,
  IconBrandMessengerFilled,
  IconMessageCircle,
  IconLock,
  IconAdjustmentsHorizontal,
  IconKey,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { IconTile } from '@/components/primitives/IconTile';

const CHANNELS = [
  { name: 'WhatsApp', icon: IconBrandWhatsappFilled, color: '#25D366', y: 110 },
  { name: 'Instagram', icon: IconBrandInstagram, color: '#E1306C', y: 235 },
  { name: 'Messenger', icon: IconBrandMessengerFilled, color: '#0084FF', y: 365 },
  { name: 'Web chat', icon: IconMessageCircle, color: 'var(--amber-500)', y: 490 },
] as const;

/** Decorative channel flow. Reduced motion keeps connections and hides moving signals. */
export function AuthIllustration() {
  const id = useId();
  const paths = [
    ...CHANNELS.map(({ y, color }) => ({ d: `M 270 ${y} C 305 ${y}, 305 300, 340 300`, color })),
    { d: 'M 660 300 C 705 300, 705 210, 750 210', color: 'var(--blue-500)' },
    { d: 'M 660 300 C 705 300, 705 390, 750 390', color: 'var(--blue-500)' },
  ];
  return (
    <div aria-hidden className="pointer-events-none relative w-full select-none" data-auth-artwork>
      <div className="relative isolate aspect-[5/3] w-full">
        <div className="absolute inset-x-1/4 inset-y-1/4 rounded-full bg-[var(--blue-500)]/10 blur-3xl" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" fill="none">
          <defs>
            {paths.map(({ color }, index) => (
              <linearGradient key={index} id={`${id}-flow-${index}`}>
                <stop stopColor={color} stopOpacity="0.55" />
                <stop offset="1" stopColor="var(--blue-500)" stopOpacity="0.18" />
              </linearGradient>
            ))}
          </defs>
          {paths.map(({ d }, index) => (
            <path key={d} d={d} stroke={`url(#${id}-flow-${index})`} strokeWidth="1.5" />
          ))}
          <g className="motion-reduce:hidden" data-auth-signals>
            {paths.map(({ d, color }, index) => (
              <circle key={d} r="3.5" fill={color}>
                <animateMotion
                  dur="5s"
                  begin={`${index * -0.8}s`}
                  repeatCount="indefinite"
                  path={d}
                />
              </circle>
            ))}
          </g>
        </svg>
        {CHANNELS.map(({ name, icon: Icon, color, y }) => (
          <div
            key={name}
            data-auth-node
            className="absolute left-[5%] flex w-[22%] -translate-y-1/2 items-center gap-2 rounded-card border border-[var(--border-subtle)] bg-white/85 px-2 py-3 shadow-sm backdrop-blur-sm xl:px-3"
            style={{ top: `${(y / 600) * 100}%` }}
          >
            <Icon size={18} stroke={1.6} className="shrink-0" style={{ color }} />
            <span className="text-2xs font-medium text-[var(--text-primary)] xl:text-xs">
              {name}
            </span>
          </div>
        ))}
        <div
          data-auth-node
          className="absolute top-1/2 left-1/2 w-[32%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-panel border border-white/10 p-4 text-white shadow-xl xl:p-6"
          style={{ background: 'var(--chrome-bg)' }}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div className="relative">
            <div className="mb-5 flex items-center justify-between">
              <Mark size={24} tone="inverse" />
              <IconLock size={14} stroke={1.5} className="text-white/45" />
            </div>
            <p className="text-sm font-medium tracking-tight xl:text-base">Your workspace</p>
          </div>
        </div>
        {[
          {
            title: 'Assistant rules',
            detail: 'Your guidance',
            icon: IconAdjustmentsHorizontal,
            top: '35%',
          },
          { title: 'API credentials', detail: 'Scoped access', icon: IconKey, top: '65%' },
        ].map(({ title, detail, icon: Icon, top }) => (
          <div
            key={title}
            data-auth-node
            className="absolute left-[75%] flex w-[24%] -translate-y-1/2 items-center gap-2 rounded-card border border-[var(--border-subtle)] bg-white/90 p-2 shadow-sm backdrop-blur-sm xl:gap-3 xl:p-4"
            style={{ top }}
          >
            <IconTile icon={Icon} size="md" tone="info" />
            <div className="min-w-0">
              <p className="text-2xs leading-snug font-medium text-[var(--text-primary)] xl:text-xs">
                {title}
              </p>
              <p className="mt-1 text-2xs leading-snug text-[var(--text-tertiary)]">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
