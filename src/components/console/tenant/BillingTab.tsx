'use client';

import { IconCalendar, IconCoin, IconCreditCard, IconReceipt } from '@tabler/icons-react';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { Panel, SectionHeading } from '@/components/console/Surface';
import type { WorkspaceDetail } from '@/lib/console/data';
import { SubscriptionControls } from './SubscriptionControls';

const amount = (value: number | null | undefined) =>
  value == null ? 'Not priced' : `KES ${value.toLocaleString('en-KE')}`;

export function BillingTab({
  w,
  plans,
}: {
  w: WorkspaceDetail;
  plans: Array<{ code: string; name: string; requiresContract?: boolean }>;
}) {
  const contract = w.contract;
  return (
    <div>
      <FactStrip label="Workspace subscription summary">
        <FactCell
          icon={IconCreditCard}
          label="Current plan"
          value={w.plan}
          note={contract?.standing ?? 'No subscription record'}
        />
        <FactCell
          icon={IconCoin}
          label="Monthly contract value"
          value={amount(contract?.monthly)}
          note={
            contract?.basis === 'negotiated'
              ? 'Agreed workspace price'
              : contract?.basis === 'unpriced'
                ? 'A contract price has not been recorded.'
                : 'Normalized to a monthly amount'
          }
        />
        <FactCell
          icon={IconReceipt}
          label="Estimated amount due"
          value={
            !contract || contract.basis === 'unpriced'
              ? 'Unavailable'
              : amount(contract.arrears?.amount ?? 0)
          }
          note={
            !contract || contract.basis === 'unpriced'
              ? 'A recorded contract price is needed for this estimate.'
              : contract.arrears
                ? `${contract.arrears.days} days since the recorded past-due date`
                : 'No estimated past-due amount'
          }
          tone={contract?.arrears ? 'warning' : 'neutral'}
        />
        <FactCell
          icon={IconCalendar}
          label="Current period ends"
          value={contract?.periodEnd ?? 'Not recorded'}
          note={
            contract?.cancelAtPeriodEnd
              ? 'Scheduled to end at this period boundary'
              : 'As recorded on the subscription'
          }
        />
      </FactStrip>
      <SectionHeading
        title="Manage subscription"
        note="Review the impact of a plan or status change before confirming it."
        align="right"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Contract details">
          <dl className="divide-y divide-[var(--border-subtle)]">
            {[
              ['Plan', contract?.planName ?? w.plan],
              [
                'Subscription status',
                contract?.subscriptionStatus.replaceAll('_', ' ') ?? 'Not recorded',
              ],
              ['Current period starts', contract?.periodStart ?? 'Not recorded'],
              ['Current period ends', contract?.periodEnd ?? 'Not recorded'],
              ['Trial ends', contract?.trialEnds ?? 'Not applicable'],
              ['Past due since', contract?.pastDueSince ?? 'Not recorded'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-3 py-3">
                <dt className="t-compact text-[var(--text-secondary)]">{label}</dt>
                <dd className="t-compact font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Subscription actions">
          <p className="t-body mb-5 text-[var(--text-secondary)]">
            A reason is required for each change and is included in the workspace’s activity.
          </p>
          <div className="rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
            <SubscriptionControls
              tenantId={w.id}
              workspace={w.name}
              currentPlan={w.plan}
              status={contract?.subscriptionStatus ?? ''}
              plans={plans}
            />
          </div>
        </Panel>
      </div>
      <SectionHeading
        title="Payment records"
        note="Contract values help with follow-up; they do not confirm payment."
        align="left"
      />
      <Panel title="Invoices and payments">
        <div className="flex items-start gap-4 rounded-overlay bg-[var(--surface-raised)] p-5">
          <IconReceipt
            size={24}
            stroke={1.5}
            aria-hidden
            className="shrink-0 text-[var(--text-tertiary)]"
          />
          <div>
            <p className="t-body font-medium">Payment records are not connected.</p>
            <p className="t-compact mt-2 max-w-[70ch] text-[var(--text-secondary)]">
              This console does not issue invoices or collect payments yet. Estimated amounts due
              are calculated from subscription prices and recorded dates.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
