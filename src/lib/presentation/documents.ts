/**
 * The document index behind the presentation surface.
 *
 * ⚠ AUDIENCE NOTE, AND IT IS NOT A DETAIL.
 *
 * `01-brief-and-decisions.md` opens with "internal working document, not
 * client-facing". It contains the decision log, the risk register including
 * "scope drift through helpfulness", and candid notes about where we disagree
 * with an implication of the brief. It is marked `internal` below and it is NOT
 * rendered on the client-facing index.
 *
 * The commercial terms are likewise absent from the shared surface. They are
 * agreed between Ian and Brian directly, and a shared link is the wrong place
 * for a payment schedule.
 *
 * If Brian should see either, that is a decision for Dennis and Ian, and it is
 * one flag flip here rather than a rewrite.
 */

export type DocAudience = 'client' | 'internal';

export type ProjectDoc = {
  slug: string;
  n: string;
  title: string;
  /** What this document settles. One line, no marketing. */
  settles: string;
  /** Which requirement or brief section it answers to. */
  source: string;
  band: 'foundation' | 'system' | 'surface' | 'delivery';
  audience: DocAudience;
};

export const PROJECT_DOCS: ProjectDoc[] = [
  {
    slug: '00-INDEX',
    n: '00',
    title: 'Documentation index',
    settles: 'The engagement in four lines, the governing constraint, and the reading order',
    source: 'Orientation',
    band: 'foundation',
    audience: 'client',
  },
  {
    slug: '01-brief-and-decisions',
    n: '01',
    title: 'Brief and decision log',
    settles: 'Twelve decisions the rest of the set rests on, with the reasoning behind each',
    source: 'Internal working document',
    band: 'foundation',
    audience: 'internal',
  },
  {
    slug: '02-information-architecture',
    n: '02',
    title: 'Information architecture',
    settles: 'Every route in Phase 1, across two applications sharing one codebase',
    source: 'Requirements 4, 5',
    band: 'foundation',
    audience: 'client',
  },
  {
    slug: '03-design-system',
    n: '03',
    title: 'Design system · aLcassa',
    settles: 'Palette, the one-weight type system, sixty-four components, the boundary frame',
    source: 'Derived',
    band: 'system',
    audience: 'client',
  },
  {
    slug: '04-system-architecture',
    n: '04',
    title: 'System architecture',
    settles: 'Eleven architecture decision records, the request pipeline, caching, observability',
    source: 'Brief section 03',
    band: 'system',
    audience: 'client',
  },
  {
    slug: '05-data-model',
    n: '05',
    title: 'Data model',
    settles: 'Full schema, every policy, and sixteen invariants with the mechanism enforcing each',
    source: 'Brief section 03',
    band: 'system',
    audience: 'client',
  },
  {
    slug: '06-tenancy-and-isolation',
    n: '06',
    title: 'Tenancy and isolation',
    settles: 'The guarantee stated precisely, the ten-case test suite, and support mode',
    source: 'Requirement 1',
    band: 'system',
    audience: 'client',
  },
  {
    slug: '07-api-contract',
    n: '07',
    title: 'API contract',
    settles: 'Both doors: the session door and the machine door, with one error catalogue',
    source: 'Requirements 6, 8',
    band: 'system',
    audience: 'client',
  },
  {
    slug: '08-subscriptions-entitlements-ai-rules',
    n: '08',
    title: 'Subscriptions, entitlements and AI rules',
    settles: 'Plans as data, one guard for both doors, the singleton, and the five-second contract',
    source: 'Requirements 3, 8',
    band: 'surface',
    audience: 'client',
  },
  {
    slug: '09-platform-console-and-support-mode',
    n: '09',
    title: 'Platform console and support mode',
    settles: 'The owner workspace, the organization switcher, and the support role matrix',
    source: 'Requirement 4',
    band: 'surface',
    audience: 'client',
  },
  {
    slug: '10-copy-deck',
    n: '10',
    title: 'Copy deck',
    settles: 'Every string a person reads, written once so the product has one voice',
    source: 'Derived',
    band: 'surface',
    audience: 'client',
  },
  {
    slug: '11-build-plan-and-agent-guide',
    n: '11',
    title: 'Build plan and agent guide',
    settles: 'Milestone mapping, gates, testing strategy, and the operating rules for the build',
    source: 'Brief section 04',
    band: 'delivery',
    audience: 'client',
  },
  {
    slug: '12-handover-package',
    n: '12',
    title: 'Handover package',
    settles: 'Requirement 7 treated as a deliverable with its own acceptance test',
    source: 'Requirement 7',
    band: 'delivery',
    audience: 'client',
  },
  {
    slug: '13-code-brief',
    n: '13',
    title: 'Implementation brief',
    settles: 'The build order for the design system and the component kit',
    source: 'Derived',
    band: 'delivery',
    audience: 'client',
  },
  {
    slug: '15-spec-delta',
    n: '15',
    title: 'Specification delta',
    settles:
      'Every place the code deliberately differs from a document, with the reason and the decision',
    source: 'Requirement 7',
    band: 'delivery',
    audience: 'client',
  },
  {
    slug: '16-channel-adapter-guide',
    n: '16',
    title: 'Channel adapter guide',
    settles:
      'The Phase 2 messaging seam: the connection table, the internal event shape, the adapter interface, and how a tenant is resolved from an inbound webhook',
    source: 'Requirement 7',
    band: 'delivery',
    audience: 'client',
  },
];

export type DesignSheet = {
  slug: string;
  n: string;
  title: string;
  settles: string;
  source: string;
  band: 'system' | 'screen' | 'behaviour';
};

/** Sheet 14 is the index of the design set; this mirrors it exactly. */
export const DESIGN_SHEETS: DesignSheet[] = [
  {
    slug: '01-token-sheet',
    n: '01',
    title: 'Token sheet',
    settles: 'Colour, surface ramp, space, radius, the one shadow, marks',
    source: 'Derived',
    band: 'system',
  },
  {
    slug: '02-type-specimen',
    n: '02',
    title: 'Type',
    settles: 'Fourteen steps, three families, one weight, and the voice',
    source: 'Derived',
    band: 'system',
  },
  {
    slug: '03-controls',
    n: '03',
    title: 'Controls',
    settles: 'Button, field, chip, selection, and every state each has',
    source: 'Derived',
    band: 'system',
  },
  {
    slug: '04-composition',
    n: '04',
    title: 'Composition',
    settles: 'Page shell, panel, data grid, banner, dialog',
    source: 'Derived',
    band: 'system',
  },
  {
    slug: '05-platform-console',
    n: '05',
    title: 'Platform console',
    settles: 'What the owner sees first and what needs attention',
    source: 'Requirement 4',
    band: 'screen',
  },
  {
    slug: '06-tenant-detail',
    n: '06',
    title: 'Tenant detail',
    settles: 'Entitlements against usage, and the audit trail',
    source: 'Requirements 3, 6',
    band: 'screen',
  },
  {
    slug: '07-support-mode',
    n: '07',
    title: 'Support mode',
    settles: 'The switcher, the boundary, and the scoped session',
    source: 'Brief section 03',
    band: 'screen',
  },
  {
    slug: '08-auth',
    n: '08',
    title: 'Access',
    settles: 'Login, reset, invitation, sessions, role matrix',
    source: 'Requirement 2',
    band: 'screen',
  },
  {
    slug: '09-tenant-settings',
    n: '09',
    title: 'Tenant settings',
    settles: 'Company profile, and the credential store',
    source: 'Requirement 5',
    band: 'screen',
  },
  {
    slug: '10-ai-rules',
    n: '10',
    title: 'AI rules',
    settles: 'Master singleton, tenant rules, the service door',
    source: 'Requirement 8',
    band: 'screen',
  },
  {
    slug: '11-platform-health',
    n: '11',
    title: 'Platform health',
    settles: 'Service status, metrics, businesses needing a decision',
    source: 'Requirement 10',
    band: 'screen',
  },
  {
    slug: '12-errors-and-empties',
    n: '12',
    title: 'Refusals',
    settles: 'One error contract, limits at both doors, empty states',
    source: 'Requirement 6',
    band: 'behaviour',
  },
  {
    slug: '13-motion-and-access',
    n: '13',
    title: 'Motion and access',
    settles: 'What may move, focus order, keys, redaction',
    source: 'Proposed addition',
    band: 'behaviour',
  },
  {
    slug: '14-handover',
    n: '14',
    title: 'Handover',
    settles: 'The sheet index, the open decisions, and design lock',
    source: 'Requirement 7',
    band: 'behaviour',
  },
];

/**
 * Sheet 14, section on open decisions.
 *
 * 24 Aug 2026: five of the original seven are answered (precedence, support
 * role matrix, embedding model, plan tiers, suspension). See `01 D-13`,
 * `01 D-08`, `05 §8`, `08 §2` and `06 §8`. The support role answer opened one
 * new, narrower question of its own, listed here in place of the one it
 * closed: whether the support role's now-general write access extends to
 * customer records, which `09 §4` argues it should not. Two questions remain
 * as originally drawn, both proposals rather than anything blocking.
 */
export const OPEN_DECISIONS = [
  {
    question: 'Does full support-mode access extend to customer records?',
    when: 'Before M4a',
    blocks: "The isolation suite's support-mode cases for this table",
    severity: 'blocking',
    detail:
      "Confirmed 24 Aug 2026: support mode is read and write generally, which the original brief's read-only default did not anticipate. That answer did not name customer records specifically, and Andishi's proposal is that this one table stays the exception: it is the personal data of your tenants' customers rather than a tenant's own configuration, and it is the one dataset where a support session's access has real privacy weight. Confirm or extend; the matrix generates test cases, so it needs a signature rather than a nod.",
    where: 'Sheets 07 and 08 · document 09 §4',
  },
  {
    question: 'A recorded reason on each support switch',
    when: 'Design lock',
    blocks: 'Nothing',
    severity: 'proposal',
    detail:
      'Optional in Phase 1 as drawn. We would argue for making it mandatory, more so now that support mode can write: a session that can change data and cannot explain why six months later is a materially worse position than a read-only one in the same spot. It costs one required field.',
    where: 'Sheet 07 · document 09 §3',
  },
  {
    question: 'Is there a product name and any brand assets?',
    when: 'Design lock',
    blocks: 'Nothing',
    severity: 'proposal',
    detail:
      'aLcassa is the codename for the design system and this document set, not a proposed product name. If no identity exists, the placeholder mark ships and looks deliberate. When a real one arrives, one file changes and nothing else does.',
    where: 'Document 03 §22',
  },
] as const;
