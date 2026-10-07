import type { Metadata } from 'next';
import { Badge, SUBSCRIPTION_STATUS_TONE } from '@/components/primitives/Badge';
import { getBilling } from '@/lib/tenant/data';

export const metadata: Metadata = { title: 'Billing' };

/** Subscription records are live; automated payments and invoice history are outside Phase One. */
export default async function BillingPage() {
  const model = await getBilling();

  return (
    <div className="mx-auto py-10" style={{ maxWidth: 'var(--measure-prose)' }}>
      <h1 className="t-heading text-[var(--text-primary)]">Billing</h1>

      <section
        className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-panel border p-5"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
      >
        <div>
          <p className="t-label text-[var(--text-tertiary)]">Current plan</p>
          <p className="t-heading mt-1 text-[var(--text-primary)]">{model.planName}</p>
          <p className="t-data mt-1 text-[var(--text-secondary)]">{model.price}</p>
        </div>
        <div className="text-right">
          <Badge tone={SUBSCRIPTION_STATUS_TONE[model.status] ?? 'active'}>
            {model.status === 'active' ? 'Active' : model.status.replace('_', ' ')}
          </Badge>
          <p className="t-caption mt-1.5 text-[var(--text-tertiary)]">Renews {model.periodEnd}</p>
        </div>
      </section>

      <div className="mt-6 grid gap-4">
        <p className="t-body text-[var(--text-secondary)]">
          Payment is handled directly for now rather than through automatic card charges — invoices
          are sent to your company contact email and settled by bank transfer.
        </p>
        <p className="t-body text-[var(--text-secondary)]">
          Automatic billing and self-serve plan changes are the focus of the next phase. Until then,
          plan changes, invoices and receipts all go through the same contact route.
        </p>
      </div>

      <div className="mt-7">
        <a
          href={`mailto:${model.contactEmail}`}
          className="t-compact inline-flex h-10 items-center rounded-chip border px-4 font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-inset)]"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          Contact billing — {model.contactEmail}
        </a>
      </div>
    </div>
  );
}
