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

    let colorClass = 'text-[var(--graphite-ink)]';
    if (delta.direction === 'up') colorClass = 'text-[var(--verdigris-ink)]';
    if (delta.direction === 'down') colorClass = 'text-[var(--oxide-ink)]';

    return (
      <span className={`t-compact font-medium ml-2 ${colorClass}`}>
        {delta.direction === 'up' && '↑ '}
        {delta.direction === 'down' && '↓ '}
        {delta.value}
      </span>
    );
  };

  return (
    <div className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] p-5 flex flex-col justify-between">
      <h3 className="t-micro uppercase text-[var(--ink-tertiary)] tracking-wider">
        {label}
      </h3>
      
      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline">
          <span className="t-data text-[var(--ink-primary)] text-2xl font-variant-numeric:tabular-nums">
            {value}
          </span>
          {renderDelta()}
        </div>
        
        {sparkline && sparkline.length > 0 && (
          <div className="w-16 h-8 flex items-end gap-[1px]">
            {sparkline.map((val, idx) => {
              const max = Math.max(...sparkline) || 1;
              const heightPct = Math.max(10, (val / max) * 100);
              return (
                <div 
                  key={idx} 
                  className="w-full bg-[var(--copper-solid)] opacity-50 rounded-t-sm"
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
