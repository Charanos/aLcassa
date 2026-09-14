import React from 'react';

export type StatusDotProps = {
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  label?: string;
  size?: 'sm' | 'md';
};

export function StatusDot({ status, label, size = 'sm' }: StatusDotProps) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  let bgClass = 'bg-[var(--ink-500)]';
  if (status === 'operational') bgClass = 'bg-[var(--green-500)]';
  if (status === 'degraded') bgClass = 'bg-[var(--amber-500)]';
  if (status === 'down') bgClass = 'bg-[var(--red-500)]';

  const dot = (
    <div
      className={`${sizeClass} rounded-full ${bgClass} shrink-0`}
      aria-hidden={!!label}
      aria-label={!label ? `Status: ${status}` : undefined}
    />
  );

  if (!label) return dot;

  return (
    <div className="flex items-center gap-2">
      {dot}
      <span className="t-compact text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}
