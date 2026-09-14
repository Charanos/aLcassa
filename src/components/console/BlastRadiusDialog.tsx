'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconAlertTriangle } from '@tabler/icons-react';
import { applyPlanChange } from '@/app/(platform)/platform/(console)/actions';
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
 *
 * Built directly on Radix `Dialog` rather than `ConfirmDialog`: three
 * meaningfully different actions (cancel, apply now, apply next period) do
 * not fit a binary cancel/confirm contract without losing the one the
 * comment above is about.
 */
export function BlastRadiusDialog({ change }: { change: PlansModel['pendingChange'] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(when: 'now' | 'next_period') {
    setError(null);
    startTransition(async () => {
      const result = await applyPlanChange({
        plan: change.plan,
        field: change.field,
        to: change.to,
        when,
      });
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          setOpen(next);
          if (!next) setError(null);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="t-compact h-8 shrink-0 rounded-panel px-3.5 whitespace-nowrap"
          style={{ background: 'var(--blue-500)', color: 'var(--text-inverse)', fontWeight: 500 }}
        >
          Save changes
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[150]"
          style={{
            background: 'var(--surface-overlay)',
            animation: 'overlay-in var(--duration-fast) linear',
          }}
        />
        {/* Centring on the wrapper, not on a transform. `panel-in` ends at
            `transform: none`, and the reduced-motion rule forces it with
            `!important` — either cancels translate-based centring, the second
            one permanently. See `ProvisionWorkspaceDialog`. */}
        <div className="pointer-events-none fixed inset-0 z-[150] grid place-items-center p-4">
        <Dialog.Content
          className="surface-glass-strong pointer-events-auto w-[560px] max-w-[92vw] overflow-hidden rounded-overlay"
          style={{ animation: 'panel-in var(--duration-base) var(--ease-out)' }}
        >
          <div className="p-6">
            <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
              Confirm plan change
            </p>
            <Dialog.Title asChild>
              <h2 className="display display-md mt-2.5" style={{ color: 'var(--text-primary)' }}>
                This affects {change.affected} workspaces
              </h2>
            </Dialog.Title>
            <Dialog.Description asChild>
              <p className="t-body mt-3" style={{ color: 'var(--text-secondary)' }}>
                {change.plan} · {change.field},{' '}
                <span className="numeric" style={{ color: 'var(--text-primary)' }}>
                  {change.from} → {change.to}
                </span>
                .
              </p>
            </Dialog.Description>

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

            {error ? (
              <p
                role="alert"
                className="t-compact mt-3 flex items-start gap-1.5"
                style={{ color: 'var(--danger-fg)' }}
              >
                <IconAlertTriangle size={14} stroke={1.5} className="mt-px shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}
          </div>

          <div
            className="flex flex-wrap items-center gap-2.5 border-t px-6 py-3.5"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
          >
            <span className="t-caption numeric flex-1" style={{ color: 'var(--text-tertiary)' }}>
              plan.entitlement_change
            </span>
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={pending}
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
            </Dialog.Close>
            {/* Forcing it now is available and deliberately not the primary. */}
            <button
              type="button"
              onClick={() => submit('now')}
              disabled={pending}
              className="t-compact rounded-panel px-3.5"
              style={{
                height: 36,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--danger-fg)',
                opacity: pending ? 0.7 : 1,
              }}
            >
              Apply now
            </button>
            <button
              type="button"
              onClick={() => submit('next_period')}
              disabled={pending}
              className="t-compact rounded-panel px-4"
              style={{
                height: 36,
                border: 'none',
                background: 'var(--blue-500)',
                color: 'var(--text-inverse)',
                fontWeight: 500,
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? 'Applying…' : 'Apply next period'}
            </button>
          </div>
        </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
