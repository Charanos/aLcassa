'use client';

import { useState, useTransition } from 'react';
import { IconAlertTriangle, IconSettings } from '@tabler/icons-react';
import {
  changePlanLimit,
  previewPlanLimit,
} from '@/app/(platform)/platform/(console)/plan-actions';
import type { PlanLimitImpact } from '@/modules/platform';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { useToast } from '@/components/primitives/Toast';
import type { HeadroomRow } from '@/lib/console/data';

/**
 * Move a ceiling on the plan catalogue.
 *
 * ⚠ THIS BUTTON WAS DISABLED WITH A CORRECT EXPLANATION AND NO WAY TO ACT ON
 *   IT. The tooltip-turned-paragraph read: *"Limits are a property of the plan,
 *   so changing one here would change what every workspace on it is entitled
 *   to. To lift a ceiling for a single customer, grant an override on that
 *   workspace instead."*
 *
 * Both sentences are true. Neither is a reason the platform owner cannot change
 * his own price list — they are a reason the control must SAY which of the two
 * things it does, and then count the consequence. It does: the dialog names the
 * plan, the number of workspaces on it, and how many are already above the
 * proposed ceiling.
 *
 * ⚠ THE STRANDED COUNT IS THE FIGURE THE DECISION TURNS ON, and it is read
 * from the database when the value changes rather than estimated here. Dropping
 * seats from 25 to 10 is housekeeping if nobody is over 10 and a support
 * incident if four workspaces are — and the headroom bars above cannot answer
 * that, because a median and a maximum are not a count against a number the
 * operator has just typed.
 *
 * ⚠ NO `entitlementId`, NO CONTROL. The designed fixture has no row to write
 * to; rendering an edit button over invented numbers would be worse than the
 * disabled one it replaces.
 */
export function LimitEditor({
  row,
  planName,
  variant = 'button',
}: {
  row: HeadroomRow;
  planName: string;
  /**
   * `button` is the footer pill that replaced the dead "Manage limits".
   * `inline` is the per-row control inside the expanded card, which is where
   * the edit actually belongs — a footer button can only ever act on one row,
   * and which row that is was never something the reader chose.
   */
  variant?: 'button' | 'inline';
}) {
  const pushToast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>(row.limit === null ? '' : String(row.limit));
  const [unlimited, setUnlimited] = useState(row.limit === null);
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState<PlanLimitImpact | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!row.entitlementId) return null;
  const entitlementId = row.entitlementId;

  const parsed = unlimited ? null : Number.parseInt(value, 10);
  const valid = unlimited || (Number.isInteger(parsed) && (parsed as number) >= 1);
  const changedFrom = valid && parsed !== row.limit;
  const ready = changedFrom && reason.trim().length >= 8;

  /* The preview runs when the VALUE settles, not on confirm — so the stranded
     count is on screen while the operator is still deciding, which is the only
     moment it can change their mind. Same call `SubscriptionControls` makes. */
  function check(next: number | null) {
    if (next === row.limit) {
      setImpact(null);
      return;
    }
    setChecking(true);
    void previewPlanLimit({ entitlementId, to: next }).then((r) => {
      setChecking(false);
      if (r.ok) setImpact(r.impact);
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await changePlanLimit({
        entitlementId,
        to: unlimited ? null : (parsed as number),
        reason,
      });
      if (result.ok) {
        setOpen(false);
        setReason('');
        pushToast({
          tone: 'success',
          title: `${planName} · ${result.impact.entitlementName} is now ${
            result.impact.to === null ? 'unlimited' : result.impact.to
          }`,
          description: `${result.impact.affected} ${
            result.impact.affected === 1 ? 'workspace' : 'workspaces'
          } on this plan. Nobody was removed.`,
        });
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          setImpact(null);
          setOpen(true);
        }}
        className={
          variant === 'inline'
            ? 'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 transition-colors hover:bg-[var(--surface-inset)]'
            : 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-medium whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]'
        }
        style={
          variant === 'inline'
            ? { font: '500 10.5px/1.6 var(--font-mono)', color: 'var(--text-tertiary)' }
            : {
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }
        }
      >
        {variant === 'inline' ? (
          'edit'
        ) : (
          <>
            <IconSettings size={16} stroke={1.5} aria-hidden />
            Manage limits
          </>
        )}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={(n) => {
          if (!pending) setOpen(n);
        }}
        title={`${planName} · ${row.label}`}
        consequence="A limit belongs to the plan, so this changes what every workspace on it is entitled to."
        details={
          <div className="grid gap-4 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="grid gap-1.5">
              <label htmlFor="limit-value" className="t-label" style={{ color: 'var(--text-secondary)' }}>
                New limit
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="limit-value"
                  type="number"
                  min={1}
                  value={value}
                  disabled={unlimited}
                  onChange={(e) => setValue(e.target.value)}
                  onBlur={() => {
                    const n = Number.parseInt(value, 10);
                    if (Number.isInteger(n) && n >= 1) check(n);
                  }}
                  className="h-[38px] w-[120px] rounded-chip px-3 outline-none"
                  style={{
                    border: '1px solid var(--border-strong)',
                    background: unlimited ? 'var(--surface-sunken)' : 'var(--surface-raised)',
                    boxShadow: 'var(--neu-inset)',
                    color: unlimited ? 'var(--text-disabled)' : 'var(--text-primary)',
                    font: '400 var(--text-base)/1 var(--font-mono)',
                  }}
                />
                <label className="t-compact flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={unlimited}
                    onChange={(e) => {
                      setUnlimited(e.target.checked);
                      check(e.target.checked ? null : Number.parseInt(value, 10));
                    }}
                  />
                  Unlimited
                </label>
                <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                  was {row.limit === null ? 'unlimited' : row.limit}
                </span>
              </div>
            </div>

            {checking ? (
              <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                Checking what this affects…
              </p>
            ) : impact ? (
              <ul
                className="grid list-none gap-2 p-0"
                aria-live="polite"
              >
                <li className="t-compact" style={{ color: 'var(--text-primary)' }}>
                  {impact.affected} {impact.affected === 1 ? 'workspace is' : 'workspaces are'} on{' '}
                  {impact.planName}.
                </li>
                {impact.stranded > 0 ? (
                  <li
                    className="flex items-start gap-2.5 rounded-panel px-3 py-2.5"
                    style={{
                      background: 'var(--badge-warning-bg)',
                      border: '1px solid var(--badge-warning-edge)',
                    }}
                  >
                    <IconAlertTriangle
                      size={15}
                      stroke={1.5}
                      aria-hidden
                      style={{ color: 'var(--warning-fg)', marginTop: '1px', flexShrink: 0 }}
                    />
                    <span className="t-compact" style={{ color: 'var(--text-primary)' }}>
                      {impact.stranded} {impact.stranded === 1 ? 'is' : 'are'} already above this.{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Nobody is removed &mdash; they keep what they have and cannot add more. Grant
                        an override on those workspaces if that is not what you want.
                      </span>
                    </span>
                  </li>
                ) : (
                  <li className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                    None is above the new ceiling.
                  </li>
                )}
              </ul>
            ) : null}

            <div className="grid gap-1.5">
              <label htmlFor="limit-reason" className="t-label" style={{ color: 'var(--text-secondary)' }}>
                Why &middot; goes in the platform log
              </label>
              <input
                id="limit-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Growth seats raised to 30 for the Q4 price list."
                className="h-[38px] w-full rounded-chip px-3 outline-none"
                style={{
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-raised)',
                  boxShadow: 'var(--neu-inset)',
                  color: 'var(--text-primary)',
                  font: '400 var(--text-sm)/1 var(--font-ui)',
                }}
              />
            </div>
          </div>
        }
        confirmLabel={ready ? 'Change the limit' : 'Change the limit'}
        loading={pending}
        error={error}
        tone="destructive"
        onConfirm={() => {
          if (ready) submit();
        }}
      />
    </>
  );
}
