'use client';

import { useState } from 'react';
import { IconChevronRight, IconPlus, IconX } from '@tabler/icons-react';

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

/**
 * THE PUBLIC ANSWERS, AND EVERY ONE OF THEM CHECKABLE.
 *
 * ⚠ THIS BLOCK WAS THE MOST CONFIDENT PROSE IN THE REPOSITORY AND THE LEAST
 *   SUPPORTED. It is a marketing page, so nobody reviewed it the way a policy
 *   file gets reviewed — and it is also the page a prospect reads BEFORE the
 *   contract, which makes an overstatement here not a rough edge but a
 *   representation.
 *
 * What it said, against what the code does:
 *
 *   · "zero master keys exist anywhere on the platform" — `asService()` and
 *     `DATABASE_URL_ADMIN` exist. The claim is not an exaggeration of the
 *     design, it is its opposite. The real design is better and is now stated:
 *     the elevated path exists, a lint rule confines it to `modules/platform`,
 *     and it cannot run without writing an audit row.
 *   · "SET LOCAL app.current_tenant_id" — the setting is `app.tenant_id`. A
 *     prospect's engineer who greps for that string finds nothing.
 *   · "mathematically impossible" — nothing here is proved mathematically. What
 *     exists is better evidence for a buyer anyway: 152 isolation cases that
 *     block the build.
 *   · "isolated tenant credential vault with envelope encryption" — there is no
 *     vault and no envelope encryption. There is an argon2id hash in a
 *     row-level-secured table, and a projection type that makes returning it a
 *     compile error, which is the stronger claim and the true one.
 *   · "encrypted at rest with AES-256", "meeting compliance requirements under
 *     the Kenya Data Protection Act 2019 (ODPC) and GDPR" — a legal conclusion
 *     nobody has signed, on a platform whose retention and erasure work is
 *     explicitly out of Phase 1 scope.
 *   · "prorated billing", "100MB PDF delivery", "10,000+ simultaneous inbound
 *     messages", "real-time WebSocket protocol", "Team Leads" — the inbox and
 *     billing are designed placeholder surfaces in Phase 1, there is no payment
 *     gateway, there is no WebSocket in the repository, and `member_role` is
 *     exactly `owner | admin | agent`.
 *
 * ⚠ THE FIX IS NOT TO DELETE THE ANSWERS. A buyer asking "can you handle a
 * campaign spike" needs an answer, and "we will not say" loses the deal as
 * surely as a false yes loses the renewal. Each answer now states what Phase 1
 * does and names what is scheduled rather than implying it already runs —
 * which is the rule the product's own surfaces already follow, where every
 * unwired control refuses by name and says which milestone wires it.
 *
 * ⚠ ONE RULE FOR ANYTHING ADDED HERE: if you cannot point at the file, the
 * migration or the CI job that makes the sentence true, do not write it.
 */
const FAQ_CATEGORIES: CategoryGroup[] = [
  {
    id: 'architecture-rls',
    title: 'Architecture & RLS Tenancy',
    faqs: [
      {
        id: 'rls-isolation',
        question: 'How does aLcassa enforce strict data isolation between client workspaces?',
        answer:
          'Every tenant-scoped table carries a PostgreSQL Row Level Security policy, and the application connects as a role that does not hold BYPASSRLS — so the boundary is enforced by the database engine rather than by application code remembering to filter. A table without a policy fails the build, and 152 isolation cases run against a real database on every push with no override path.',
        tag: 'PostgreSQL RLS · Enforced In CI',
      },
      {
        id: 'query-leakage-safety',
        question: 'Can database queries accidentally leak data during high-traffic webhook bursts?',
        answer:
          'Tenant context is set inside the transaction that uses it, as a transaction-local setting — so it is discarded when the transaction ends and cannot persist on a pooled connection into somebody else’s request, which matters because the pooler runs in transaction mode. With no context set, the policies resolve to null and queries return zero rows rather than everything.',
        tag: 'Transaction-Local Context',
      },
      {
        id: 'master-keys',
        question: 'Does anyone at aLcassa hold a key that reads across every workspace?',
        answer:
          'There is one elevated database path, and we would rather describe it than claim it does not exist. A lint rule confines it to the platform module and fails the build anywhere else, every call writes an audit row before it runs, and no customer-facing route can reach it. A platform owner entering a workspace does not use it — they open a scoped support session instead, under the same rules that workspace’s own staff work under.',
        tag: 'Audited, Not Absent',
      },
      {
        id: 'credential-vault',
        question: 'Where are tenant cryptographic credentials and API tokens stored?',
        answer:
          'API keys are hashed with argon2id and are never recoverable — a key is shown once, at creation, and afterwards only its masked prefix and last-used time. The hash column is absent from the type every route reads, so returning it is a compile error rather than something a reviewer has to catch. The credentials table is row-level secured like every other tenant table.',
        tag: 'argon2id · Shown Once',
      },
    ],
  },
  {
    id: 'whatsapp-webhooks',
    title: 'WhatsApp & Meta Webhooks',
    faqs: [
      {
        id: 'whatsapp-waba',
        question:
          'Can we connect our existing WhatsApp Business Number without interrupting live chats?',
        answer:
          'Yes — the integration is built against the official Meta Cloud API, so you keep ownership of your WhatsApp Business Account, your display name and your verification badge. Nothing moves to a number we control, which is what makes a switchover reversible.',
        tag: 'Official Meta Cloud API',
      },
      {
        id: 'media-payloads',
        question: 'Does aLcassa support rich media, voice notes, and PDF delivery receipts?',
        answer:
          'The channel contract covers documents, images, voice notes, location and quick-reply templates. The unified inbox is a designed surface in Phase 1 rather than a running one, and the size and format limits will be Meta’s rather than ours — we would rather quote them once the inbox is wired than quote a number now and correct it later.',
        tag: 'Designed · Phase 2',
      },
      {
        id: 'campaign-spikes',
        question:
          'How does the system handle high-urgency message spikes during peak sales campaigns?',
        answer:
          'Webhook ingest is designed to acknowledge first and queue, so a burst is absorbed rather than dropped and triage runs behind the acknowledgement. It has not been load-tested yet, so there is no throughput figure on this page: the number you are given at handover will be one we measured.',
        tag: 'Not Yet Measured',
      },
    ],
  },
  {
    id: 'ai-rule-engine',
    title: 'AI & Rule Engine',
    faqs: [
      {
        id: 'rule-propagation',
        question: 'How fast do custom AI assistant rules and triage routing updates take effect?',
        answer:
          'Rules compile to a cached, versioned form keyed by workspace, and publishing bumps the version — so the next request reads the new rules rather than waiting for a cache to expire. A platform-wide rule change invalidates every workspace at publish. Propagation is a cache invalidation, not a scheduled sync.',
        tag: 'Versioned Rule Cache',
      },
      {
        id: 'kenyan-vernacular',
        question:
          'Can we customize brand tone and support Sheng / Swahili vernacular for Kenyan customers?',
        answer:
          'Rules and persona guidance are authored as instructions rather than chosen from a fixed language list, so Sheng, Swahili and English are a matter of how you write them rather than of a feature we have to ship. How well a given model handles Sheng specifically is worth testing against your own conversations during onboarding.',
        tag: 'Instruction-Authored',
      },
      {
        id: 'hallucination-safeguards',
        question: 'What stops the assistant from inventing an answer on a high-stakes enquiry?',
        answer:
          'Escalation is a rule you write rather than a behaviour you hope for: a matching enquiry goes to a named human instead of being answered. The rule engine is deterministic, so the same enquiry routes the same way twice — which is the property that makes an escalation policy auditable at all.',
        tag: 'Deterministic Escalation',
      },
    ],
  },
  {
    id: 'security-audit-dpa',
    title: 'Security, Audit & Data Protection',
    faqs: [
      {
        id: 'kenya-dpa-compliance',
        question:
          'Is customer message data compliant with the Kenya Data Protection Act (DPA 2019)?',
        answer:
          'We will not claim a compliance finding nobody has signed. What is built: data sits in a managed Postgres service with encryption in transit and at rest, tenant separation is enforced by the database rather than by application code, and every access is written to an append-only trail you can read. Retention and erasure automation are scoped work, flagged rather than quietly omitted, and a data processing agreement is a document your counsel should review rather than a tag on this page.',
        tag: 'Stated, Not Certified',
      },
      {
        id: 'support-protocol',
        question: 'What happens if our team requests technical assistance from aLcassa engineers?',
        answer:
          'An engineer opens a session scoped to your workspace alone, which expires after 30 minutes with no extension. They see your data under the same Row Level Security rules your own staff work under — not a superadmin view. The session is written to your own activity log with the engineer’s name, a stated reason and a reference number, so you read why it happened rather than being told.',
        tag: '30-Minute Scoped Session',
      },
      {
        id: 'audit-exports',
        question: 'Can workspace administrators export audit trail logs for regulatory compliance?',
        answer:
          'Administrators can read their workspace’s full activity trail in the product today, support sessions opened by us included. The trail is append-only and that is enforced by policy — it grants select and grants no update or delete, so no one can edit it, ourselves included. Downloadable CSV and JSON export is built for the platform owner and is being extended to workspace administrators.',
        tag: 'Append-Only By Policy',
      },
    ],
  },
  {
    id: 'workspace-seats',
    title: 'Workspace & Seat Metering',
    faqs: [
      {
        id: 'team-rbac-roles',
        question:
          'Can we assign different channel access or permission levels to different team members?',
        answer:
          'There are three workspace roles — owner, admin and agent — and the boundary between them is enforced by database policy rather than by hiding buttons: an agent cannot write an admin-only table even with a crafted request. Per-channel assignment within a workspace is not modelled yet, and we would rather say so than have you plan a rollout around it.',
        tag: 'Owner · Admin · Agent',
      },
      {
        id: 'seat-expansion',
        question: 'How does agent seat expansion work when onboarding seasonal support teams?',
        answer:
          'Owners and admins invite staff from Settings, and seat limits are entitlements on your plan, checked when the invitation is issued rather than discovered at the end of the month. Phase 1 carries no payment gateway, so raising a limit is a conversation and an invoice rather than a self-service charge.',
        tag: 'Entitlement-Enforced',
      },
      {
        id: 'concurrency-limits',
        question: 'Is there a limit on the number of simultaneous active agent sessions?',
        answer:
          'No fixed cap. Every request carries its own transaction-scoped tenant context, so concurrent staff never contend for shared per-connection state — the property that makes concurrency safe here rather than merely fast. Live collaborative presence inside the inbox is Phase 2 work.',
        tag: 'No Fixed Cap',
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
        <ellipse
          cx="8%"
          cy="40%"
          rx="380"
          ry="220"
          stroke="url(#faq-arch-grad)"
          strokeWidth="0.7"
        />
        <ellipse
          cx="92%"
          cy="30%"
          rx="440"
          ry="250"
          stroke="url(#faq-arch-grad)"
          strokeWidth="0.7"
        />
      </svg>

      <div className="relative z-10">
        {/* ── Right-Aligned Section Header (Alternating Rhythm) ── */}
        <div className="mb-12 ml-auto flex max-w-3xl flex-col items-end text-right sm:mb-16">
          <div className="inline-flex items-center gap-2">
            <p className="font-mono text-xs font-medium tracking-wider text-[var(--orange-500)] uppercase">
              Frequently Asked Questions
            </p>
            <span className="size-2 rounded-full bg-[var(--orange-500)]" aria-hidden />
          </div>
          <h2 className="display mt-3 text-2xl leading-tight font-normal tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Clear answers on architecture,
            <br className="hidden sm:block" /> privacy, and onboarding.
          </h2>
          <p className="mt-3 text-md leading-relaxed text-[var(--text-secondary)] sm:text-md">
            Everything you need to know about our PostgreSQL tenant isolation, Meta Cloud APIs, and
            Kenyan enterprise workflows.
          </p>
        </div>

        {/* ── Two-Column Unboxed Master-Detail Layout ── */}
        <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
          {/* Left 5 Cols: Unboxed Category Tabs */}
          <div className="flex flex-col gap-2 lg:col-span-5">
            {FAQ_CATEGORIES.map((category) => {
              const isActive = category.id === activeCategoryId;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`group flex w-full cursor-pointer items-center justify-between rounded-card px-5 py-4 text-left transition-all duration-200 ${
                    isActive
                      ? 'translate-x-1 border border-[var(--border-subtle)] bg-white font-medium text-[var(--text-primary)] shadow-[0_4px_25px_rgba(0,0,0,0.06)] sm:translate-x-1.5'
                      : 'font-medium text-[var(--text-tertiary)] hover:bg-white/50 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate text-base sm:text-md">{category.title}</span>

                  <IconChevronRight
                    size={16}
                    className={`shrink-0 transition-transform duration-200 ${
                      isActive
                        ? 'translate-x-0.5 text-[var(--text-primary)]'
                        : 'text-[var(--text-tertiary)] group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right 7 Cols: Unboxed Accordion Cards */}
          <div className="flex flex-col gap-3.5 lg:col-span-7">
            {activeCategory.faqs.map((faq) => {
              const isOpen = openFaqIds[activeCategory.id] === faq.id;

              return (
                <div
                  key={faq.id}
                  className={`overflow-hidden transition-all duration-200 ${
                    isOpen
                      ? 'rounded-card border border-[var(--ink-200)] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)]'
                      : 'rounded-card border border-[var(--border-subtle)] bg-white/60 p-4.5 shadow-xs hover:border-[var(--ink-200)] hover:bg-white/90 sm:p-5'
                  }`}
                >
                  {/* Trigger Header */}
                  <button
                    type="button"
                    onClick={() => toggleFaq(activeCategory.id, faq.id)}
                    aria-expanded={isOpen}
                    className="flex w-full cursor-pointer items-start justify-between gap-4 text-left select-none"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      {isOpen && faq.tag && (
                        <span className="mb-2 inline-flex items-center rounded-panel border border-emerald-200/60 bg-emerald-50/90 px-2 py-0.5 font-mono text-2xs font-medium tracking-wider text-emerald-700 uppercase">
                          {faq.tag}
                        </span>
                      )}
                      <h3
                        className={`text-base leading-snug transition-colors sm:text-md ${
                          isOpen
                            ? 'font-medium text-[var(--text-primary)]'
                            : 'font-medium text-[var(--text-primary)] group-hover:text-[var(--blue-600)]'
                        }`}
                      >
                        {faq.question}
                      </h3>
                    </div>

                    {/* Plus / Close Icon */}
                    <div
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-overlay transition-colors ${
                        isOpen
                          ? 'text-[var(--text-primary)] hover:bg-slate-100'
                          : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isOpen ? (
                        <IconX size={17} stroke={1.75} />
                      ) : (
                        <IconPlus size={17} stroke={1.75} />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isOpen && (
                    <div
                      className="mt-4 border-t border-[var(--ink-100)]/70 pt-4 text-base leading-relaxed text-[var(--text-secondary)] sm:text-base"
                      /* tailwindcss-animate is not installed in this project, so the
             animate-in/fade-in/slide-in-* utilities were inert — this
             arrived with no transition at all. globals.css already defines
             the keyframes below, and its reduced-motion block covers them. */
                      style={{ animation: 'overlay-in var(--duration-base) var(--ease-standard)' }}
                    >
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
