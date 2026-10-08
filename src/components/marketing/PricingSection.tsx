'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconArrowRight } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';

interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  isPopular?: boolean;
  description: string;
  monthlyPrice: number; // in KES (0 for custom)
  annualPrice: number; // in KES per month when billed annually
  periodLabel: string;
  ctaText: string;
  ctaHref: string;
  ctaVariant: 'primary' | 'secondary';
  features: { text: string; highlight?: boolean }[];
  specs: { label: string; value: string }[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'pro',
    name: 'Pro',
    description:
      'Ideal for single-operator businesses, boutique commerce brands, and specialized support desks.',
    monthlyPrice: 3400,
    annualPrice: 2890,
    periodLabel: 'per workspace / month',
    ctaText: 'Start with Pro',
    ctaHref: '/sign-up?plan=pro',
    ctaVariant: 'secondary',
    specs: [
      { label: 'Seats', value: '1 Agent' },
      { label: 'Channels', value: '1 Connected' },
      { label: 'Monthly Quota', value: '1,000 Chats' },
      { label: 'Support SLA', value: '24h Standard' },
    ],
    features: [
      { text: '1 Agent seat with full unified inbox access' },
      { text: '1 Connected channel (WhatsApp Cloud API or Meta)' },
      { text: '1,000 Monthly active conversations included' },
      { text: '100 Knowledge base documents for AI triage' },
      { text: '10 Assistant rule versions retained' },
      { text: '30-Day immutable activity history' },
      { text: '2 Scoped Argon2id API keys' },
      { text: 'PostgreSQL Row-Level Security (RLS) data isolation' },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    badge: 'MOST POPULAR',
    isPopular: true,
    description:
      'Engineered for high-volume support teams, multi-channel retailers, and scaling operations.',
    monthlyPrice: 17000,
    annualPrice: 14450,
    periodLabel: 'per workspace / month',
    ctaText: 'Start Free Trial with Business',
    ctaHref: '/sign-up?plan=business',
    ctaVariant: 'primary',
    specs: [
      { label: 'Seats', value: '10 Agents' },
      { label: 'Channels', value: '5 Connected' },
      { label: 'Monthly Quota', value: '6,000 Chats' },
      { label: 'Support SLA', value: '8h Priority' },
    ],
    features: [
      { text: '10 Agent seats with granular multi-tenant RBAC', highlight: true },
      { text: '5 Connected channels (WhatsApp, IG, Messenger, Web Chat)', highlight: true },
      { text: '6,000 Monthly active conversations included', highlight: true },
      { text: '1,000 Knowledge base documents & rich PDF indexing' },
      { text: '50 Assistant rule versions with instant rollback' },
      { text: '90-Day immutable audit trail with CSV export' },
      { text: 'Swahili, Sheng & Multilingual AI routing policies' },
      { text: 'Multi-agent real-time WebSocket concurrency' },
      { text: '10 Scoped API keys with edge webhook buffering' },
      { text: '8h Priority SLA technical support desk' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    badge: 'ENTERPRISE',
    description:
      'Dedicated infrastructure, unlimited throughput, bespoke AI models, and 24/7 engineering SLA.',
    monthlyPrice: 0,
    annualPrice: 0,
    periodLabel: 'tailored annual contract',
    ctaText: 'Talk to Engineering & Sales',
    ctaHref: 'mailto:sales@alcassa.com?subject=Enterprise%20Inquiry%20-%20aLcassa',
    ctaVariant: 'secondary',
    specs: [
      { label: 'Seats', value: 'Unlimited' },
      { label: 'Channels', value: 'Unlimited' },
      { label: 'Monthly Quota', value: 'Custom High-Volume' },
      { label: 'Support SLA', value: '2h Dedicated' },
    ],
    features: [
      { text: 'Unlimited agent seats with custom provisioning', highlight: true },
      { text: 'Unlimited connected channels & custom SMS gateways', highlight: true },
      { text: 'Custom high-volume conversation throughput' },
      { text: 'Unlimited knowledge base & custom vector ingestion' },
      { text: 'Unlimited AI rule versions & custom fine-tuned LLMs' },
      { text: '365-Day compliance audit feed (Kenya DPA 2019 / GDPR)' },
      { text: 'Zero-Trust Scoped Support Protocol (30-min tokens)' },
      { text: 'Dedicated PgBouncer tenant connection pool' },
      { text: '2h Dedicated 24/7 engineering SLA' },
      { text: 'Custom security review & scoped VPC deployment' },
    ],
  },
];

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* ── Atmospheric Ambient Orbs & Concentric Geometry ── */}
      <div
        className="pointer-events-none absolute -top-20 -left-28 size-[650px] rounded-full opacity-60 blur-[130px] select-none"
        style={{
          background:
            'radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, rgba(226, 232, 240, 0.25) 50%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-28 size-[680px] rounded-full opacity-60 blur-[140px] select-none"
        style={{
          background:
            'radial-gradient(circle, rgba(59, 130, 246, 0.09) 0%, rgba(191, 219, 254, 0.2) 50%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/4 size-[720px] rounded-full opacity-45 blur-[140px] select-none"
        style={{
          background:
            'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, rgba(226, 232, 240, 0.25) 55%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Subtle Architectural Concentric Engineering Curves */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03] select-none"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pricing-arch-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ink-900)" stopOpacity="0.7" />
            <stop offset="50%" stopColor="var(--blue-500)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--orange-500)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path
          d="M -50 120 C 400 240, 800 40, 1350 180 C 1750 300, 2050 90, 2400 230"
          stroke="url(#pricing-arch-grad)"
          strokeWidth="1.1"
        />
        <path
          d="M -50 280 C 450 420, 750 160, 1300 340 C 1700 460, 2000 210, 2400 370"
          stroke="url(#pricing-arch-grad)"
          strokeWidth="0.85"
        />
        <ellipse
          cx="12%"
          cy="45%"
          rx="420"
          ry="240"
          stroke="url(#pricing-arch-grad)"
          strokeWidth="0.7"
        />
        <ellipse
          cx="88%"
          cy="35%"
          rx="460"
          ry="260"
          stroke="url(#pricing-arch-grad)"
          strokeWidth="0.7"
        />
      </svg>

      <div className="relative z-10">
        {/* ── Section Header & Interactive Billing Switch ── */}
        <div className="mb-12 flex flex-col justify-between gap-6 sm:mb-16 md:flex-row md:items-end">
          <div className="flex max-w-3xl flex-col items-start text-left">
            <div className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--orange-500)]" aria-hidden />
              <p className="font-mono text-xs font-medium tracking-wider text-[var(--orange-500)] uppercase">
                Pricing & Workspace Packages
              </p>
            </div>
            <h2 className="display mt-3 text-2xl leading-tight font-normal tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Predictable plans for growing teams
              <br className="hidden sm:block" /> & high-throughput enterprises.
            </h2>
            <p className="mt-3 text-md leading-relaxed text-[var(--text-secondary)] sm:text-md">
              No surprise overages or per-event penalties. Scale your customer support operations on
              dedicated PostgreSQL isolation with transparent billing in Kenyan Shillings (KES).
            </p>
          </div>

          {/* Interactive Billing Frequency Switch */}
          <div className="flex shrink-0 items-center gap-3 self-start md:self-end">
            <div
              className="inline-flex items-center rounded-full border border-[var(--ink-200)] bg-[var(--surface-raised)] p-1 shadow-xs"
              role="radiogroup"
              aria-label="Billing cycle"
            >
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                role="radio"
                aria-checked={billingCycle === 'monthly'}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  billingCycle === 'monthly'
                    ? 'bg-[var(--text-primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                role="radio"
                aria-checked={billingCycle === 'annual'}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  billingCycle === 'annual'
                    ? 'bg-[var(--text-primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Annual</span>
                <span className="py-0.2 rounded-full bg-[var(--orange-500)] px-1.5 font-mono text-2xs font-medium text-white uppercase">
                  Save 15%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 3-Tier Grid Layout (Pro, Business [Featured], Custom) ── */}
        <div className="grid grid-cols-1 items-stretch gap-6 sm:gap-8 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => {
            const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
            const formattedPrice =
              tier.monthlyPrice === 0 ? 'Tailored' : `KES ${price.toLocaleString('en-GB')}`;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-hero transition-all duration-300 ${
                  tier.isPopular
                    ? 'border-2 border-[var(--blue-500)] bg-white p-7 shadow-[0_20px_60px_-15px_rgba(4,58,225,0.12)] sm:p-9 lg:-translate-y-2'
                    : 'border border-[var(--border-subtle)] bg-white/80 p-7 shadow-xs backdrop-blur-md hover:border-[var(--ink-200)] hover:bg-white hover:shadow-md sm:p-8'
                }`}
              >
                {/* Popular Pill Badge (Clean typography, no sparkles) */}
                {tier.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-[var(--blue-500)] px-3.5 py-1 font-mono text-2xs font-medium tracking-wider text-white uppercase shadow-sm">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div>
                  {/* Tier Title & Description */}
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-medium text-[var(--text-primary)]">{tier.name}</h3>
                    {tier.badge && !tier.isPopular && (
                      <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2.5 py-0.5 font-mono text-2xs font-medium tracking-wider text-[var(--text-tertiary)] uppercase">
                        {tier.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 min-h-[42px] text-base leading-relaxed text-[var(--text-secondary)]">
                    {tier.description}
                  </p>

                  {/* Price Block */}
                  <div className="mt-6 border-t border-[var(--ink-100)] pt-6">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-2xl">
                        {formattedPrice}
                      </span>
                      {tier.monthlyPrice > 0 && (
                        <span className="font-mono text-sm text-[var(--text-tertiary)] uppercase">
                          / month
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                      {tier.monthlyPrice > 0
                        ? billingCycle === 'annual'
                          ? 'Billed annually · KES ' +
                            (price * 12).toLocaleString('en-GB') +
                            ' / year'
                          : 'Billed monthly · Cancel or change seats anytime'
                        : 'Custom SLA commitments & volume contracts'}
                    </p>
                  </div>

                  {/* Key Quick Specs Bento Matrix */}
                  <div className="mt-6 grid grid-cols-2 gap-2 rounded-card border border-[var(--ink-100)] bg-[var(--surface-sunken)]/70 p-3">
                    {tier.specs.map((spec) => (
                      <div key={spec.label} className="flex flex-col">
                        <span className="font-mono text-2xs tracking-wider text-[var(--text-tertiary)] uppercase">
                          {spec.label}
                        </span>
                        <span className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Checklist of Features & Entitlements */}
                  <div className="mt-6 space-y-3">
                    <p className="font-mono text-xs font-medium tracking-wider text-[var(--text-tertiary)] uppercase">
                      Included in {tier.name}:
                    </p>
                    <ul className="space-y-2.5">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm leading-snug">
                          <span
                            className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full ${
                              tier.isPopular
                                ? 'bg-blue-50 text-[var(--blue-500)]'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            <IconCheck size={12} stroke={2.5} />
                          </span>
                          <span
                            className={
                              feature.highlight
                                ? 'font-medium text-[var(--text-primary)]'
                                : 'text-[var(--text-secondary)]'
                            }
                          >
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card CTA Action */}
                <div className="mt-8 border-t border-[var(--ink-100)] pt-6">
                  <Button
                    asChild
                    variant={tier.ctaVariant}
                    size="lg"
                    className={`w-full justify-center rounded-full transition-all duration-200 ${
                      tier.isPopular
                        ? 'bg-[var(--blue-500)] text-white shadow-sm hover:bg-[var(--blue-600)] hover:shadow-md'
                        : 'hover:bg-[var(--surface-sunken)]'
                    }`}
                  >
                    <Link href={tier.ctaHref} className="gap-2 font-medium">
                      <span>{tier.ctaText}</span>
                      <IconArrowRight size={16} stroke={2} />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
