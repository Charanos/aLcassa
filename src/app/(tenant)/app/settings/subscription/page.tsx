import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { Badge, SUBSCRIPTION_STATUS_TONE } from '@/components/feedback/Badge';
import { LimitBar } from '@/components/domain/LimitBar';
import { getSubscription } from '@/lib/tenant/data';
import { getLiveSubscription } from '@/lib/tenant/live';

export const metadata: Metadata = { title: 'Plan and usage' };

/**
 * 08 §8. `/app/settings/subscription`. Owner. Verbatim from the doc: every
 * entitlement as a row with a limit bar; any active override shown with its
 * reason; a read-only statement of how payment works today; no upgrade
 * button — "a button that opens an email client is worse than a sentence
 * saying to get in touch."
 */
export default async function SubscriptionSettingsPage() {
  const model = (await getLiveSubscription()) ?? (await getSubscription());

  return (
    <div>
      <PageHeader
        title="Plan and usage"
        description="What your plan includes and how much of it you are using."
        breadcrumbs={[{ label: 'Settings', href: '/app/settings/company' }, { label: 'Plan and usage' }]}
      />

      <section
        className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-panel border p-5"
        style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-raised)' }}
      >
        <div>
          <p className="t-label text-[var(--ink-tertiary)]">Current plan</p>
          <p className="t-heading mt-1 text-[var(--ink-primary)]">{model.planName}</p>
        </div>
        <div className="text-right">
          <Badge tone={SUBSCRIPTION_STATUS_TONE[model.status] ?? 'active'}>
            {model.status === 'active' ? 'Active' : model.status.replace('_', ' ')}
          </Badge>
          <p className="t-caption mt-1.5 text-[var(--ink-tertiary)]">Renews {model.periodEnd}</p>
        </div>
      </section>

      {model.overrides.length > 0 ? (
        <section className="mb-6 grid gap-2">
          {model.overrides.map((o) => (
            <p
              key={o.key}
              className="t-compact rounded-chip border px-3.5 py-2.5"
              style={{ borderColor: 'var(--copper-rule)', background: 'var(--copper-tint)', color: 'var(--ink-primary)' }}
            >
              <span className="font-medium">Override active on {o.key.replace('_', ' ')}:</span> {o.reason}
              {o.expiresAt ? ` — expires ${o.expiresAt}` : ' — no expiry set'}. Granted by {o.grantedBy}.
            </p>
          ))}
        </section>
      ) : null}

      <section
        className="grid gap-5 rounded-panel border p-5"
        style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-raised)' }}
      >
        {model.entitlements.map((e) => (
          <LimitBar key={e.key} label={e.label} current={e.current} limit={e.limit} unit={e.unit} />
        ))}
      </section>

      <p className="t-caption mt-6 max-w-prose text-[var(--ink-tertiary)]">
        Billing is handled directly for now rather than through automatic card charges. See{' '}
        <a href="/app/billing" className="underline hover:text-[var(--copper-ink)]">
          Billing
        </a>{' '}
        for how payment currently works, or get in touch if you are close to a limit — most plan
        changes are a five-minute conversation.
      </p>
    </div>
  );
}
