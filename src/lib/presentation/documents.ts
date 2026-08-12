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
    slug: '13--code-brief',
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
 * Sheet 14, section on open decisions. Four of the six are blocking, and three
 * of those are due in week one. Chase them the day the brief is signed: a
 * schema locked without the rules precedence answer is a schema that gets
 * migrated in week seven.
 */
export const OPEN_DECISIONS = [
  {
    question: 'Precedence between master and tenant AI rules',
    when: 'Week 1',
    blocks: 'M4a and the schema',
    severity: 'blocking',
    detail:
      'Three models are drawn and they produce different tables. Andishi recommends the layered model: master rules carry a per-field lock, so a tenant can change what is permitted and see plainly what is not. It costs about a day more than the naive options and removes an entire category of future support conversation.',
    where: 'Sheet 10 · document 08 §4',
  },
  {
    question: 'What the support role may see and do',
    when: 'Design lock',
    blocks: 'M4',
    severity: 'blocking',
    detail:
      'Drawn as read-only throughout, with write controls visibly disabled and credentials withheld entirely. The one to argue about is customer records: we propose the support role cannot read them at all, because they are the personal data of your tenants’ customers rather than a tenant’s own configuration. Confirm or narrow; the matrix generates test cases, so it needs a signature rather than a nod.',
    where: 'Sheets 07 and 08 · document 09 §4',
  },
  {
    question: 'Embedding model Phase 2 will use',
    when: 'Week 1',
    blocks: 'The knowledge base seam',
    severity: 'blocking',
    detail:
      'The vector column records which model produced each embedding, so a later change is survivable rather than a full silent re-index. Confirming the model in week one avoids the problem entirely.',
    where: 'Document 05 §8',
  },
  {
    question: 'Plan tiers, with their limits',
    when: 'Week 4',
    blocks: 'M3',
    severity: 'blocking',
    detail:
      'Free, Starter, Growth and Scale are drawn with 2, 5, 15 and unlimited seats as a proposal. Entitlements are rows rather than code, so changing any of these before M3 costs an insert and no deployment.',
    where: 'Sheets 05, 06, 09 · document 08 §2',
  },
  {
    question: 'What suspension actually means',
    when: 'Before M1',
    blocks: 'The modify policies',
    severity: 'blocking',
    detail:
      'Read-only, fully blocked, or a grace period. We recommend read-only with a clear explanation: a suspended customer who can still see their configuration and their team is a customer who can fix their billing problem. One who is locked out entirely opens a support ticket, and you are the support team.',
    where: 'Document 06 §8',
  },
  {
    question: 'A recorded reason on each support switch',
    when: 'Design lock',
    blocks: 'Nothing',
    severity: 'proposal',
    detail:
      'Optional in Phase 1 as drawn. We would argue for making it mandatory: a support session with a stated reason is one that can be explained six months later. It costs one required field.',
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
