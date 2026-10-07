'use client';

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

/**
 * The subscription controls on a workspace's billing tab.
 *
 * ⚠ FOUR AUDITED SERVICES EXISTED AND NOTHING CALLED THEM. 17 §6.2 named these
 * "the cheapest wins in the pass": `assignPlan`, `changeSubscriptionStatus`,
 * `grantOverride` and `previewPlanChange` are built, tested and audited in
 * `modules/platform`, with server-action wrappers already written. The tab
 * simply had no controls — so an operator could read that a workspace is on Pro
 * and had no way to move it, on the screen that exists to manage that workspace.
 *
 * ⚠ THE PREVIEW IS NOT A COURTESY, IT IS THE POINT.
 *
 * A plan change can stand a customer below a limit they are already past — move
 * a workspace using nine seats onto a one-seat plan and nine people are over the
 * line the moment it applies. `previewPlanChange` computes exactly that, marking
 * every entitlement it would STRAND, and this dialog shows the strandings before
 * the confirm button is reachable. A confirmation that says "are you sure?"
 * without saying what breaks is a dialog that trains people to click through it.
 *
 * ⚠ THE REASON IS REQUIRED BY THE SERVICE, NOT BY THIS FORM. Both actions take
 * one and it lands in the CUSTOMER'S OWN audit log — which is why the field's
 * helper says so. The operator is writing a sentence the customer will read.
 */
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

    /* ⚠ THE PREVIEW RUNS ON SELECTION, NOT ON CONFIRM. A reader choosing a plan
       needs to see the consequence while they still have a choice — computing it
       after they press the button would be describing a decision already made. */
    startTransition(async () => {
      const result = await previewWorkspacePlanChange({ tenantId, planCode: code });
      if (result.ok) setPreview(result.data);
      else setError(result.error);
    });
  }

  function confirm() {
    if (!planCode || !preview || !validAmount || pending || reason.trim().length < 4) return;
    setError(null);
    startTransition(async () => {
      const result = await assignWorkspacePlan({
        tenantId,
        planCode,
        reason: reason.trim(),
        contractAmount: requiresContract ? parsedAmount : null,
      });
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

            {/*
              ⚠ THE STRANDING WARNING IS THE MOST IMPORTANT THING IN THIS DIALOG.
              `previewPlanChange` marks every entitlement whose NEW limit sits
              below what the workspace already uses. Moving nine seats onto a
              one-seat plan is a decision somebody may still want to make — but
              never one they should make without being told.
            */}
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
                    Nothing this workspace currently uses would exceed the new plan.
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
                            uses {row.current} · new limit {row.to ?? '∞'}
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

/**
 * Subscription lifecycle.
 *
 * ⚠ THE LEGAL MOVES COME FROM THE SERVICE, NOT FROM THIS MENU. 08 §7 defines six
 * states and the nine legal transitions between them, and the service refuses an
 * illegal one — so this offers the plausible destinations and lets the refusal
 * be authoritative. Encoding the transition table here would be a second copy of
 * it, and the expensive mistake is the one that silently reactivates a customer
 * who stopped paying.
 */
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
      const result = await changeWorkspaceSubscriptionStatus({
        tenantId,
        to: to as (typeof DESTINATIONS)[number],
        reason: reason.trim(),
      });
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
        /* ⚠ AN ILLEGAL TRANSITION LANDS HERE, AND THAT IS CORRECT. The service
           owns the state table; this dialog stays open and shows what it said. */
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
