'use client';

import { useEffect, useState } from 'react';
import type { PlansModel } from '@/lib/console/data';

/**
 * The plan-change confirmation, and the button that opens it.
 *
 * ⚠ THE DEFAULT ACTION IS "APPLY NEXT PERIOD", NOT "APPLY NOW".
 *
 * A lowered limit takes effect the instant it saves, because the entitlement
 * guard reads the value on every request rather than at the start of a billing
 * cycle. For the two workspaces already above the new number that means
 * ingestion starts rejecting mid-afternoon, for a change nobody told them
 * about.
 *
 * So the primary button defers to the next period and forcing it now is the
 * secondary, quieter path. The dialog does not prevent the immediate change —
 * there are real reasons to need it — it just refuses to make it the easy
 * accident.
 */
export function BlastRadiusDialog({ change }: { change: PlansModel['pendingChange'] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="t-compact h-8 shrink-0 rounded-panel px-3.5 whitespace-nowrap"
        style={{ background: 'var(--blue-500)', color: '#ffffff', fontWeight: 500 }}
      >
        Save changes
      </button>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 grid place-items-center p-6"
          style={{
            zIndex: 90,
            background: 'var(--surface-overlay)',
            animation: 'overlay-in var(--duration-fast) linear',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blast-title"
            onClick={(e) => e.stopPropagation()}
            className="surface-glass-strong w-[560px] max-w-full overflow-hidden rounded-overlay"
            style={{ animation: 'panel-in var(--duration-base) var(--ease-out)' }}
          >
            <div className="p-6">
              <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                Confirm plan change
              </p>
              <h2
                id="blast-title"
                className="display display-md mt-2.5"
                style={{ color: 'var(--text-primary)' }}
              >
                This affects {change.affected} workspaces
              </h2>
              <p className="t-body mt-3" style={{ color: 'var(--text-secondary)' }}>
                {change.plan} · {change.field},{' '}
                <span className="numeric" style={{ color: 'var(--text-primary)' }}>
                  {change.from} → {change.to}
                </span>
                .
              </p>

              {change.breaching.length > 0 ? (
                <div
                  className="mt-4 rounded-panel p-4"
                  style={{
                    border: '1px solid var(--warning-fg)',
                    background: 'var(--warning-bg)',
                  }}
                >
                  <p
                    className="t-compact mb-2.5"
                    style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                  >
                    {change.breaching.length === 1
                      ? 'One workspace is already above the new limit:'
                      : `${change.breaching.length} workspaces are already above the new limit:`}
                  </p>
                  <div className="grid gap-2">
                    {change.breaching.map((b) => (
                      <span
                        key={b.name}
                        className="t-compact flex items-baseline justify-between gap-3"
                      >
                        <span>{b.name}</span>
                        <span className="numeric shrink-0">{b.used}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="t-compact mt-3.5" style={{ color: 'var(--text-primary)' }}>
                Their ingestion would begin rejecting <em>immediately</em>. Applying at the start of
                the next billing period gives them time to be told.
              </p>
            </div>

            <div
              className="flex flex-wrap items-center gap-2.5 border-t px-6 py-3.5"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
            >
              <span className="t-caption numeric flex-1" style={{ color: 'var(--text-tertiary)' }}>
                plan.entitlement_change
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="t-compact rounded-panel px-3.5"
                style={{
                  height: 36,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                }}
              >
                Cancel
              </button>
              {/* Forcing it now is available and deliberately not the primary. */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="t-compact rounded-panel px-3.5"
                style={{
                  height: 36,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-raised)',
                  color: 'var(--danger-fg)',
                }}
              >
                Apply now
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="t-compact rounded-panel px-4"
                style={{
                  height: 36,
                  border: 'none',
                  background: 'var(--blue-500)',
                  color: '#ffffff',
                  fontWeight: 500,
                }}
              >
                Apply next period
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
