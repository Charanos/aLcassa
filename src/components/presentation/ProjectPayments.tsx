import { COMMERCIAL, MILESTONES, PROJECT_PAYMENTS } from '@/lib/presentation/engagement';

const money = (value: number) =>
  `${COMMERCIAL.currency} ${new Intl.NumberFormat('en-KE').format(value)}`;

/** Confirmed receipts are independent of milestone readiness. */
export function ProjectPayments() {
  const paid = PROJECT_PAYMENTS.reduce((sum, receipt) => sum + receipt.amount, 0);
  const figures = [
    { label: 'Agreed fee', amount: COMMERCIAL.totalFeeAmount },
    { label: 'Received', amount: paid },
    { label: 'Balance remaining', amount: COMMERCIAL.totalFeeAmount - paid },
  ];
  return (
    <div>
      <dl className="mb-6 grid gap-4 sm:grid-cols-3">
        {figures.map((figure) => (
          <div key={figure.label} className="border-l-2 border-[var(--border-subtle)] py-1 pl-4">
            <dt className="t-caption text-[var(--text-secondary)]">{figure.label}</dt>
            <dd className="numeric mt-2 text-lg font-medium">{money(figure.amount)}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-hidden rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <ol>
          {COMMERCIAL.tranches.map((tranche) => {
            const milestone = MILESTONES.find((item) => item.tranche === tranche.n);
            const received = PROJECT_PAYMENTS.filter(
              (receipt) => receipt.tranche === tranche.n,
            ).reduce((sum, receipt) => sum + receipt.amount, 0);
            const settled = received >= tranche.amountValue;
            const status = settled
              ? 'Paid'
              : received > 0
                ? 'Part paid'
                : milestone?.status === 'complete'
                  ? 'Awaiting payment'
                  : 'Pending milestone';
            return (
              <li
                key={tranche.n}
                className="grid gap-3 border-b border-[var(--border-subtle)] px-4 py-5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:gap-6 sm:px-6"
              >
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="t-compact font-medium">
                      {tranche.n === 1 ? 'Deposit' : (milestone?.name ?? `Payment ${tranche.n}`)}
                    </h3>
                    <span className="t-data text-[var(--text-tertiary)]">
                      {tranche.share}
                      {milestone ? ` · ${milestone.id}` : ''}
                    </span>
                  </div>
                  <p className="t-caption mt-1.5 text-[var(--text-secondary)]">{tranche.trigger}</p>
                  {settled && (
                    <p className="t-caption mt-2 text-[var(--text-tertiary)]">
                      Receipt confirmed by the project lead · payment date not recorded
                    </p>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-4 sm:block sm:text-right">
                  <p className="t-compact numeric font-medium">{tranche.amount}</p>
                  <p
                    className="t-caption sm:mt-2"
                    style={{ color: settled ? 'var(--success-fg)' : 'var(--text-secondary)' }}
                  >
                    {status}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="t-caption border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-4 text-[var(--text-secondary)] sm:px-6">
          Only the deposit is recorded as paid. Milestone completion does not record a payment;
          subsequent receipts require confirmation.
        </p>
      </div>
    </div>
  );
}
