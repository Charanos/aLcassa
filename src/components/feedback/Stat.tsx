import React from 'react';

export type StatProps = {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    direction: 'up' | 'down' | 'flat';
  };
  sparkline?: number[];
};

export function Stat({ label, value, delta, sparkline }: StatProps) {
  const renderDelta = () => {
    if (!delta) return null;

    let colorClass = 'text-[var(--ink-500)]';
    if (delta.direction === 'up') colorClass = 'text-[var(--green-500)]';
    if (delta.direction === 'down') colorClass = 'text-[var(--red-500)]';

    return (
      <span className={`t-compact ml-2 font-medium ${colorClass}`}>
        {delta.direction === 'up' && '↑ '}
        {delta.direction === 'down' && '↓ '}
        {delta.value}
      </span>
    );
  };

  return (
    <div className="flex flex-col justify-between rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
      <h3 className="t-micro tracking-wider text-[var(--text-tertiary)] uppercase">{label}</h3>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline">
          <span className="t-data font-variant-numeric:tabular-nums text-2xl text-[var(--text-primary)]">
            {value}
          </span>
          {renderDelta()}
        </div>

        {sparkline && sparkline.length > 0 && (
          <div className="flex h-8 w-16 items-end gap-[1px]">
            {sparkline.map((val, idx) => {
              const max = Math.max(...sparkline) || 1;
              const heightPct = Math.max(10, (val / max) * 100);
              return (
                <div
                  key={idx}
                  className="w-full rounded-t-sm bg-[var(--blue-500)] opacity-50"
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
