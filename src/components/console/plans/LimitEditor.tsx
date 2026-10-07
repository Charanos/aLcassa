'use client';

import { useRef, useState, useTransition } from 'react';
import { IconAlertTriangle, IconSettings, IconUsers } from '@tabler/icons-react';
import {
  changePlanLimit,
  previewPlanLimit,
} from '@/app/(platform)/platform/(console)/plan-actions';
import type { PlanLimitImpact } from '@/modules/platform';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
import { useToast } from '@/components/primitives/Toast';
import type { HeadroomRow } from '@/lib/console/data';

/** Review catalogue-wide allowances before committing; workspace overrides remain effective. */
export function LimitEditor({
  row,
  planName,
  variant = 'button',
}: {
  row: HeadroomRow;
  planName: string;
  /** Place the control in a card footer or beside its allowance row. */
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
  const previewSequence = useRef(0);

  if (!row.entitlementId) return null;
  const entitlementId = row.entitlementId;

  const parsed = unlimited ? null : Number(value);
  const valid =
    unlimited ||
    (value.trim().length > 0 && Number.isSafeInteger(parsed) && (parsed as number) >= 0);
  const changedFrom = valid && parsed !== row.limit;
  const ready = changedFrom && reason.trim().length >= 8 && impact?.to === parsed && !checking;

  /* Require a preview for the selected value; discard earlier requests. */
  function check(next: number | null) {
    const sequence = ++previewSequence.current;
    setImpact(null);
    setError(null);
    setChecking(false);
    if (next !== null && (!Number.isSafeInteger(next) || next < 0)) return;
    if (next === row.limit) {
      setImpact(null);
      return;
    }
    setChecking(true);
    void previewPlanLimit({ entitlementId, to: next })
      .then((r) => {
        if (sequence !== previewSequence.current) return;
        setChecking(false);
        if (r.ok) setImpact(r.impact);
        else setError(r.error);
      })
      .catch(() => {
        if (sequence !== previewSequence.current) return;
        setChecking(false);
        setError('The impact could not be checked. Try again.');
      });
  }

  function submit() {
    if (!ready || !impact) return;
    setError(null);
    startTransition(async () => {
      const result = await changePlanLimit({
        entitlementId,
        to: unlimited ? null : parsed,
        reason,
        expectedPreview: impact.fingerprint,
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
        setImpact(null);
      }
    });
  }

  return (
    <>
      <button
        aria-label={`Edit ${planName} ${row.label} allowance`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          setImpact(null);
          previewSequence.current += 1;
          setChecking(false);
          setValue(row.limit === null ? '' : String(row.limit));
          setUnlimited(row.limit === null);
          setOpen(true);
        }}
        className={
          variant === 'inline'
            ? 'inline-flex shrink-0 items-center gap-1 rounded-panel px-2 py-0.5 transition-colors hover:bg-[var(--surface-inset)]'
            : 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]'
        }
        style={
          variant === 'inline'
            ? { font: '500 var(--type-micro)/1.6 var(--font-mono)', color: 'var(--text-tertiary)' }
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

      <ConsoleDialog
        open={open}
        onOpenChange={(n) => setOpen(n)}
        dismissible={!pending}
        eyebrow="Plan catalogue"
        title={`${planName} · ${row.label}`}
        width="lg"
        operation="plan.limit_changed"
        description="A limit belongs to the plan, so this changes what every workspace on it is entitled to. To lift a ceiling for one customer instead, grant an override on that workspace."
        facts={
          <>
            <DialogFact icon={IconUsers}>
              Existing records stay in place. The new allowance applies to every workspace on this
              plan.
            </DialogFact>
            <DialogFact icon={IconAlertTriangle}>
              Impact uses the latest recorded workspace usage. Workspaces without a recorded counter
              are listed separately.
            </DialogFact>
          </>
        }
        error={error}
        actions={
          <DialogActions
            confirmLabel="Change the limit"
            confirmIcon={IconSettings}
            onConfirm={submit}
            disabled={!ready}
            loading={pending}
            tone="destructive"
          />
        }
      >
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start">
            <div className="block">
              <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
                New limit
              </span>
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  aria-label="New limit"
                  min={0}
                  value={value}
                  disabled={unlimited}
                  onChange={(e) => {
                    setValue(e.target.value);
                    previewSequence.current += 1;
                    setImpact(null);
                    setChecking(false);
                  }}
                  onBlur={() => {
                    const n = Number(value);
                    if (value.trim() && Number.isSafeInteger(n) && n >= 0) check(n);
                  }}
                  className="t-body w-[110px] rounded-chip px-3 outline-none"
                  style={{
                    height: 38,
                    border: '1px solid var(--border-strong)',
                    background: unlimited ? 'var(--surface-sunken)' : 'var(--surface-raised)',
                    color: unlimited ? 'var(--text-disabled)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span
                  className="t-caption whitespace-nowrap"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  was {row.limit === null ? '∞' : row.limit}
                </span>
              </div>
              <label
                className="t-caption mt-2.5 flex w-fit items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <input
                  type="checkbox"
                  checked={unlimited}
                  onChange={(e) => {
                    setUnlimited(e.target.checked);
                    check(e.target.checked ? null : value.trim() ? Number(value) : Number.NaN);
                  }}
                />
                Unlimited
              </label>
            </div>

            {/* Reserve preview space so asynchronous reads do not move the reason field. */}
            <div
              className="grid gap-2 rounded-panel px-4 py-3.5"
              style={{ background: 'var(--surface-sunken)', minHeight: 104 }}
              aria-live="polite"
            >
              {checking ? (
                <span className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
                  Checking what this affects…
                </span>
              ) : impact ? (
                <>
                  <span className="t-compact" style={{ color: 'var(--text-primary)' }}>
                    <span className="numeric">{impact.affected}</span>{' '}
                    {impact.affected === 1 ? 'workspace is' : 'workspaces are'} on {impact.planName}
                    .
                  </span>
                  {impact.stranded > 0 ? (
                    <span
                      className="t-compact flex items-start gap-2 rounded-panel px-3 py-2"
                      style={{
                        background: 'var(--badge-warning-bg)',
                        border: '1px solid var(--badge-warning-edge)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <IconAlertTriangle
                        size={15}
                        stroke={1.5}
                        aria-hidden
                        style={{ color: 'var(--warning-fg)', marginTop: 1, flexShrink: 0 }}
                      />
                      <span>
                        <span className="numeric">{impact.stranded}</span>{' '}
                        {impact.stranded === 1 ? 'is' : 'are'} already above this. Grant an override
                        on those workspaces if that is not what you want.
                      </span>
                    </span>
                  ) : (
                    <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                      {impact.unmeasured > 0
                        ? 'No recorded usage exceeds the new allowance.'
                        : 'Current usage fits the effective allowances.'}
                    </span>
                  )}
                  {impact.unmeasured > 0 ? (
                    <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                      Usage is unavailable for {impact.unmeasured}{' '}
                      {impact.unmeasured === 1 ? 'workspace' : 'workspaces'}. Review these before
                      lowering the allowance.
                    </span>
                  ) : null}
                  {impact.overridden > 0 ? (
                    <span className="t-caption" style={{ color: 'var(--text-secondary)' }}>
                      {impact.overridden}{' '}
                      {impact.overridden === 1 ? 'workspace has' : 'workspaces have'} an active
                      override that remains in effect.
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
                  Enter a limit to see what it would affect.
                  {changedFrom ? (
                    <button
                      type="button"
                      onClick={() => check(parsed)}
                      className="ml-2 underline underline-offset-4"
                    >
                      Review current impact
                    </button>
                  ) : null}
                </span>
              )}
            </div>
          </div>

          <label className="block">
            <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
              Why{' '}
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
                · required, recorded in platform and customer activity
              </span>
            </span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Growth seats raised to 30 for the Q4 price list."
              className="t-body w-full rounded-chip px-3 outline-none"
              style={{
                height: 38,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            />
          </label>
        </div>
      </ConsoleDialog>
    </>
  );
}
