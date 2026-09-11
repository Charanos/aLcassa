'use client';

import { useState } from 'react';
import {
  IconChevronRight,
  IconPlus,
  IconX,
} from '@tabler/icons-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  tag?: string;
}

interface CategoryGroup {
  id: string;
  title: string;
  faqs: FaqItem[];
}

const FAQ_CATEGORIES: CategoryGroup[] = [
  {
    id: 'architecture-rls',
    title: 'Architecture & RLS Tenancy',
    faqs: [
      {
        id: 'rls-isolation',
        question: 'How does aLcassa enforce strict data isolation between client workspaces?',
        answer:
          'Every tenant operates under strict PostgreSQL Row Level Security (RLS). When your agents query the inbox, the database engine enforces tenant_id boundaries at the kernel query layer. There are no shared memory caches across tenants, and zero master keys exist anywhere on the platform.',
        tag: 'PostgreSQL RLS · Zero Cross-Leakage',
      },
      {
        id: 'query-leakage-safety',
        question: 'Can database queries accidentally leak data during high-traffic webhook bursts?',
        answer:
          'No. Every database connection checkout from our PgBouncer pool executes SET LOCAL app.current_tenant_id within a dedicated transaction envelope. Cross-tenant leakage is mathematically impossible at the database engine level regardless of concurrency.',
        tag: 'Scoped Connection Pool',
      },
      {
        id: 'credential-vault',
        question: 'Where are tenant cryptographic credentials and API tokens stored?',
        answer:
          'Client webhook signing secrets and access tokens are hashed using Argon2id and stored in an isolated tenant credential vault with envelope encryption. Credentials cannot be read back by unauthorized platform processes.',
        tag: 'Argon2id Vault Encryption',
      },
    ],
  },
  {
    id: 'whatsapp-webhooks',
    title: 'WhatsApp & Meta Webhooks',
    faqs: [
      {
        id: 'whatsapp-waba',
        question: 'Can we connect our existing WhatsApp Business Number without interrupting live chats?',
        answer:
          'Yes. aLcassa connects directly through the official Meta Cloud API webhook gateway. You retain full ownership of your WhatsApp Business Account (WABA), phone number display name, and Meta verification badge. Inbound message routing switches over instantaneously with zero message drops.',
        tag: 'Official Meta Cloud API',
      },
      {
        id: 'media-payloads',
        question: 'Does aLcassa support rich media, voice notes, and PDF delivery receipts?',
        answer:
          'Full bidirectional rich media streaming is natively supported. Send and receive PDF delivery invoices (up to 100MB), dispatch location pins, voice notes, high-res photos, and interactive quick-reply button templates directly from the unified inbox.',
        tag: 'Rich Media & Files',
      },
      {
        id: 'campaign-spikes',
        question: 'How does the system handle high-urgency message spikes during peak sales campaigns?',
        answer:
          'Webhook ingest runs on distributed edge consumers with automated queue buffering. Spikes of 10,000+ simultaneous inbound messages are ingested without loss and prioritized by your auto-triage rules.',
        tag: 'Edge Queue Buffering',
      },
    ],
  },
  {
    id: 'ai-rule-engine',
    title: 'AI Assistant & Rule Engine',
    faqs: [
      {
        id: 'rule-propagation',
        question: 'How fast do custom AI assistant rules and triage routing updates take effect?',
        answer:
          'Assistant instructions, sentiment classifiers, and keyword routing policies compile down to an optimized machine-readable rule cache that propagates to edge event brokers in under 5 seconds. Frontline agents and automated engines operate on updated guidelines immediately.',
        tag: '< 5s Rule Sync',
      },
      {
        id: 'kenyan-vernacular',
        question: 'Can we customize brand tone and support Sheng / Swahili vernacular for Kenyan customers?',
        answer:
          'Yes. aLcassa rule templates support multilingual natural language processing. You can configure rules for Sheng, Swahili, and formal English with custom persona guardrails (e.g. Warm Professional, Direct Corporate, or Conversational).',
        tag: 'Multilingual & Sheng',
      },
      {
        id: 'hallucination-safeguards',
        question: 'What safeguards prevent AI hallucinations on sensitive customer orders or pricing?',
        answer:
          'AI resolution operates under strict deterministic fallback boundaries. If a customer inquiry matches high financial urgency or unverified order changes, the rule engine automatically flags and transfers the ticket to a human supervisor.',
        tag: 'Deterministic Fallbacks',
      },
    ],
  },
  {
    id: 'security-audit-dpa',
    title: 'Security, Audit & DPA 2019',
    faqs: [
      {
        id: 'kenya-dpa-compliance',
        question: 'Is customer message data compliant with the Kenya Data Protection Act (DPA 2019)?',
        answer:
          'Yes. All customer identifiers, phone numbers, and message payloads are encrypted in transit via TLS 1.3 and at rest with AES-256. Audit streams are append-only and immutable, meeting compliance requirements under the Kenya Data Protection Act 2019 (ODPC) and GDPR standards.',
        tag: 'Kenya DPA 2019',
      },
      {
        id: 'support-protocol',
        question: 'What happens if our team requests technical assistance from aLcassa engineers?',
        answer:
          'Technical support requests utilize our Zero-Trust Scoped Support Protocol. Instead of universal superadmin access, engineers are granted a temporary, read-only token strictly bound to your tenant boundary that auto-expires in 30 minutes. Every query is logged to your workspace audit feed, and your admin can revoke access instantly with a single click.',
        tag: '30-Min Scoped Token',
      },
      {
        id: 'audit-exports',
        question: 'Can workspace administrators export audit trail logs for regulatory compliance?',
        answer:
          'Admins have full access to cryptographically signed JSON and CSV audit streams detailing every agent login, message read, permission update, and external API event.',
        tag: 'Immutable Audit Feed',
      },
    ],
  },
  {
    id: 'workspace-seats',
    title: 'Workspace & Seat Metering',
    faqs: [
      {
        id: 'team-rbac-roles',
        question: 'Can we assign different channel access or permission levels to different team members?',
        answer:
          'aLcassa includes granular Role-Based Access Control (RBAC). Workspace owners can designate Admins, Team Leads, and Frontline Agents. You can restrict specific channels (e.g. VIP billing inquiries or WhatsApp dispatch) to selected agents while maintaining unified supervisor visibility.',
        tag: 'Multi-Tenant RBAC',
      },
      {
        id: 'seat-expansion',
        question: 'How does agent seat expansion work when onboarding seasonal support teams?',
        answer:
          'Administrators can provision additional agent seats on-demand directly from Settings > Team. New invitations activate immediately with prorated billing and automatic workspace provisioning.',
        tag: 'Prorated Metering',
      },
      {
        id: 'concurrency-limits',
        question: 'Is there a limit on the number of simultaneous active agent sessions?',
        answer:
          'No. Multi-agent concurrency is built into our real-time WebSocket protocol. Hundreds of frontline support reps can work inside the same shared workspace without collisions or sync latency.',
        tag: 'Concurrent WebSocket',
      },
    ],
  },
];

export function FaqSection() {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('architecture-rls');
  
  // Track open accordion item per category
  const [openFaqIds, setOpenFaqIds] = useState<Record<string, string>>({
    'architecture-rls': 'rls-isolation',
    'whatsapp-webhooks': 'whatsapp-waba',
    'ai-rule-engine': 'rule-propagation',
    'security-audit-dpa': 'kenya-dpa-compliance',
    'workspace-seats': 'team-rbac-roles',
  });

  const activeCategory =
    FAQ_CATEGORIES.find((c) => c.id === activeCategoryId) ?? FAQ_CATEGORIES[0]!;

  const toggleFaq = (categoryId: string, faqId: string) => {
    setOpenFaqIds((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId] === faqId ? '' : faqId,
    }));
  };

  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* Subtle Architectural Concentric Engineering Curves */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03] select-none"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="faq-arch-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ink-900)" stopOpacity="0.7" />
            <stop offset="50%" stopColor="var(--blue-500)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--orange-500)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path
          d="M -50 80 C 400 180, 800 20, 1300 140 C 1700 240, 2000 60, 2300 180"
          stroke="url(#faq-arch-grad)"
          strokeWidth="1.1"
        />
        <path
          d="M -50 200 C 450 320, 750 100, 1250 260 C 1650 360, 1950 140, 2300 300"
          stroke="url(#faq-arch-grad)"
          strokeWidth="0.85"
        />
        <ellipse cx="8%" cy="40%" rx="380" ry="220" stroke="url(#faq-arch-grad)" strokeWidth="0.7" />
        <ellipse cx="92%" cy="30%" rx="440" ry="250" stroke="url(#faq-arch-grad)" strokeWidth="0.7" />
      </svg>

      <div className="relative z-10">
        
        {/* ── Right-Aligned Section Header (Alternating Rhythm) ── */}
        <div className="flex flex-col items-end text-right max-w-3xl ml-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--orange-500)]">
              Frequently Asked Questions
            </p>
            <span className="size-2 rounded-full bg-[var(--orange-500)]" aria-hidden />
          </div>
          <h2 className="display text-[32px] sm:text-[42px] font-normal tracking-tight text-[var(--text-primary)] mt-3 leading-tight">
            Clear answers on architecture,<br className="hidden sm:block" /> privacy, and onboarding.
          </h2>
          <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] mt-3 leading-relaxed">
            Everything you need to know about our PostgreSQL tenant isolation, Meta Cloud APIs,
            and Kenyan enterprise workflows.
          </p>
        </div>

        {/* ── Two-Column Unboxed Master-Detail Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left 5 Cols: Unboxed Category Tabs */}
          <div className="lg:col-span-5 flex flex-col gap-2">
            {FAQ_CATEGORIES.map((category) => {
              const isActive = category.id === activeCategoryId;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`group flex items-center justify-between w-full px-5 py-4 rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[var(--text-primary)] font-semibold shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-[var(--border-subtle)] translate-x-1 sm:translate-x-1.5'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/50 font-medium'
                  }`}
                >
                  <span className="text-[14.5px] sm:text-[15px] truncate">
                    {category.title}
                  </span>

                  <IconChevronRight
                    size={16}
                    className={`shrink-0 transition-transform duration-200 ${
                      isActive
                        ? 'text-[var(--text-primary)] translate-x-0.5'
                        : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right 7 Cols: Unboxed Accordion Cards */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            {activeCategory.faqs.map((faq) => {
              const isOpen = openFaqIds[activeCategory.id] === faq.id;

              return (
                <div
                  key={faq.id}
                  className={`transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.05)] border border-[var(--ink-200)] p-6'
                      : 'bg-white/60 hover:bg-white/90 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--ink-200)] p-4.5 sm:p-5 shadow-xs'
                  }`}
                >
                  {/* Trigger Header */}
                  <button
                    type="button"
                    onClick={() => toggleFaq(activeCategory.id, faq.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-start justify-between gap-4 text-left cursor-pointer select-none"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      {isOpen && faq.tag && (
                        <span className="inline-flex items-center font-mono text-[10px] uppercase font-semibold tracking-wider text-emerald-700 bg-emerald-50/90 border border-emerald-200/60 px-2 py-0.5 rounded-md mb-2">
                          {faq.tag}
                        </span>
                      )}
                      <h3
                        className={`text-[14.5px] sm:text-[15.5px] leading-snug transition-colors ${
                          isOpen
                            ? 'font-semibold text-[var(--text-primary)]'
                            : 'font-medium text-[var(--text-primary)] group-hover:text-[var(--blue-600)]'
                        }`}
                      >
                        {faq.question}
                      </h3>
                    </div>

                    {/* Plus / Close Icon */}
                    <div
                      className={`size-7 rounded-xl flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                        isOpen
                          ? 'text-[var(--text-primary)] hover:bg-slate-100'
                          : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isOpen ? <IconX size={17} stroke={1.75} /> : <IconPlus size={17} stroke={1.75} />}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-[var(--ink-100)]/70 text-[13.5px] sm:text-[14px] text-[var(--text-secondary)] leading-relaxed"
                    /* tailwindcss-animate is not installed in this project, so the
             animate-in/fade-in/slide-in-* utilities were inert — this
             arrived with no transition at all. globals.css already defines
             the keyframes below, and its reduced-motion block covers them. */
                    style={{ animation: 'overlay-in var(--duration-base) var(--ease-standard)' }}>
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
