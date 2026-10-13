'use client';

import { runConsoleMutation } from '@/lib/console/mutation';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconAlertTriangle, IconArrowsExchange, IconPlayerPause } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { Field } from '@/components/primitives/Field';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/primitives/Toast';
import {
  assignWorkspacePlan,
  changeWorkspaceSubscriptionStatus,
  previewWorkspacePlanChange,
} from '@/app/(platform)/platform/(console)/subscription-actions';
import type { PlanChangePreview } from '@/modules/platform';

/** Require a live allowance preview before plan changes; record operator reasons in customer activity. */
export function SubscriptionControls({
  tenantId,
  workspace,
  currentPlan,
  status,
  plans,
}: {
  tenantId: string;
  workspace: string;
  currentPlan: string;
  status: string;
  /** The catalogue, from the live plans read. */
  plans: Array<{ code: string; name: string; requiresContract?: boolean }>;
}) {
  return (
    <div className="grid gap-3">
      <PlanChange
        tenantId={tenantId}
        workspace={workspace}
        currentPlan={currentPlan}
        plans={plans}
      />
      <StatusChange tenantId={tenantId} workspace={workspace} status={status} />
    </div>
  );
}

function PlanChange({
  tenantId,
  workspace,
  currentPlan,
  plans,
}: {
  tenantId: string;
  workspace: string;
  currentPlan: string;
  plans: Array<{ code: string; name: string; requiresContract?: boolean }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [planCode, setPlanCode] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /* Only plans the workspace is not already on. Offering the current plan is a
     control that does nothing, which is what this whole pass removes. */
  const options = plans.filter((p) => p.name !== currentPlan);
  const stranded = preview?.rows.filter((r) => r.strands) ?? [];
  const requiresContract =
    options.find((plan) => plan.code === planCode)?.requiresContract ?? false;
  const parsedAmount = Number(contractAmount);
  const validAmount =
    !requiresContract ||
    (contractAmount.trim() !== '' &&
      Number.isSafeInteger(parsedAmount) &&
      parsedAmount >= 1 &&
      parsedAmount <= 100_000_000);

  function choose(code: string) {
    setPlanCode(code);
    setContractAmount('');
    setPreview(null);
    setError(null);
    if (!code) return;

    /* Load the consequence preview when the operator selects a plan. */
    startTransition(async () => {
      const result = await runConsoleMutation(
        () => previewWorkspacePlanChange({ tenantId, planCode: code }),
        'Plan review',
      );
      if (result.ok) setPreview(result.data);
      else setError(result.error);
    });
  }

  function confirm() {
    if (!planCode || !preview || !validAmount || pending || reason.trim().length < 4) return;
    setError(null);
    startTransition(async () => {
      const result = await runConsoleMutation(
        () =>
          assignWorkspacePlan({
            tenantId,
            planCode,
            reason: reason.trim(),
            contractAmount: requiresContract ? parsedAmount : null,
            expectedPreview: preview.fingerprint,
          }),
        'Plan assignment',
      );
      if (result.ok) {
        setOpen(false);
        setPlanCode('');
        setContractAmount('');
        setReason('');
        setPreview(null);
        toast({
          tone: 'success',
          title: 'Plan changed',
          description: `${workspace} is now on ${plans.find((plan) => plan.code === result.data.planCode)?.name ?? result.data.planCode}. The reason is recorded in customer activity.`,
        });
        router.refresh();
      } else {
        setPreview(null);
        setPlanCode('');
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<IconArrowsExchange aria-hidden />}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={options.length === 0}
        title={options.length === 0 ? 'There is no other plan in the catalogue.' : undefined}
        className="w-full"
      >
        Change plan
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) {
            setPreview(null);
            setPlanCode('');
            setError(null);
          }
        }}
        title={`Change ${workspace}'s plan`}
        consequence="Plan allowances change immediately. This console updates the subscription record; it does not collect payment."
        details={
          <div className="grid gap-4">
            <label className="block">
              <span className="t-label mb-2 block" style={{ color: 'var(--text-primary)' }}>
                New plan
              </span>
              <select
                aria-label="New plan"
                value={planCode}
                onChange={(e) => choose(e.target.value)}
                disabled={pending}
                className="t-body h-10 w-full rounded-chip px-3"
                style={{
                  border: '1px solid var(--border-strong)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Currently on {currentPlan} — choose a plan</option>
                {options.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Show allowances below current usage before enabling confirmation. */}
            {preview ? (
              <div
                className="rounded-panel px-3.5 py-3"
                style={{
                  background: stranded.length ? 'var(--badge-warning-bg)' : 'var(--surface-sunken)',
                  border: `1px solid ${stranded.length ? 'var(--badge-warning-edge)' : 'transparent'}`,
                }}
              >
                {stranded.length === 0 ? (
                  <p className="t-caption" style={{ color: 'var(--text-secondary)' }}>
                    Current usage fits the new plan. Active allowance overrides remain in effect.
                  </p>
                ) : (
                  <>
                    <p
                      className="t-caption flex items-start gap-1.5"
                      style={{ color: 'var(--warning-fg)', fontWeight: 500 }}
                    >
                      <IconAlertTriangle
                        size={13}
                        stroke={2}
                        aria-hidden
                        className="mt-px shrink-0"
                      />
                      <span>
                        {stranded.length}{' '}
                        {stranded.length === 1 ? 'limit would be' : 'limits would be'} below what
                        they already use:
                      </span>
                    </p>
                    <ul className="mt-2 grid gap-1">
                      {stranded.map((row) => (
                        <li
                          key={row.key}
                          className="t-caption flex justify-between gap-3"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <span>{row.displayName}</span>
                          <span style={{ font: '500 var(--type-chip)/1.4 var(--font-mono)' }}>
                            {row.kind === 'feature'
                              ? 'No longer included'
                              : `uses ${row.current} · new limit ${row.to ?? '∞'}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : null}

            {requiresContract ? (
              <Field
                label="Agreed monthly price (KES)"
                name="contract-amount"
                type="number"
                min={1}
                max={100_000_000}
                step={1}
                inputMode="numeric"
                value={contractAmount}
                onChange={(event) => setContractAmount(event.target.value)}
                disabled={pending}
                helper="Enter the agreed monthly amount in whole shillings. This records the contract value without collecting payment."
              />
            ) : null}
            <Field
              label="Reason"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
              helper="Explain why this change is needed. The customer can read this reason in their activity."
              placeholder="Moved to Business at their request on ticket 4412"
            />
          </div>
        }
        confirmLabel="Change plan"
        tone={stranded.length > 0 ? 'destructive' : 'primary'}
        onConfirm={confirm}
        loading={pending}
        disabled={!planCode || !preview || !validAmount || reason.trim().length < 4}
        error={error}
      />
    </>
  );
}

/** The subscription service validates lifecycle transitions; keep refusals visible in the dialog. */
function StatusChange({
  tenantId,
  workspace,
  status,
}: {
  tenantId: string;
  workspace: string;
  status: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const DESTINATIONS = ['active', 'past_due', 'paused', 'cancelled'] as const;
  const options = DESTINATIONS.filter((d) => d !== status);

  function confirm() {
    if (!to || pending || reason.trim().length < 4) return;
    setError(null);
    startTransition(async () => {
      const result = await runConsoleMutation(
        () =>
          changeWorkspaceSubscriptionStatus({
            tenantId,
            to: to as (typeof DESTINATIONS)[number],
            reason: reason.trim(),
          }),
        'Subscription update',
      );
      if (result.ok) {
        setOpen(false);
        setTo('');
        setReason('');
        toast({
          tone: 'success',
          title: 'Subscription updated',
          description: `${workspace} moved from ${result.data.from} to ${result.data.to}.`,
        });
        router.refresh();
      } else {
        /* Preserve the open dialog and show the service refusal for an invalid transition. */
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<IconPlayerPause aria-hidden />}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="w-full"
      >
        Change subscription status
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) setError(null);
        }}
        title={`Change ${workspace}'s subscription`}
        consequence="This updates the subscription record and may change workspace access. Review the new status before applying it."
        details={
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                Currently
              </span>
              <StatusBadge tone="neutral" variant="squircle" size="sm">
                {status}
              </StatusBadge>
            </div>

            <label className="block">
              <span className="t-label mb-2 block" style={{ color: 'var(--text-primary)' }}>
                Move to
              </span>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={pending}
                className="t-body h-10 w-full rounded-chip px-3"
                style={{
                  border: '1px solid var(--border-strong)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">Choose a state</option>
                {options.map((d) => (
                  <option key={d} value={d}>
                    {d.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <span className="t-caption mt-2 block" style={{ color: 'var(--text-tertiary)' }}>
                The selected change is checked against the current subscription before it is saved.
              </span>
            </label>

            <Field
              label="Reason"
              name="status-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
              helper="Included in the operator audit log and the customer’s activity. Explain why the status is changing."
              placeholder="Payment cleared on 12 September"
            />
          </div>
        }
        confirmLabel="Apply"
        tone="destructive"
        onConfirm={confirm}
        loading={pending}
        disabled={!to || reason.trim().length < 4}
        error={error}
      />
    </>
  );
}
