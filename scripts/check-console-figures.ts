#!/usr/bin/env tsx
/**
 * Do the console's screens agree with each other?
 *
 * ⚠ WRITTEN BECAUSE THEY DID NOT, AND NOTHING CAUGHT IT.
 *
 * The overview's headline said "KES 594,000 is sitting uncollected". The
 * revenue screen's ageing chart summed to 594,000 and its collection queue —
 * printed directly beneath that chart — summed to 486,000. The five debtors in
 * that queue existed in no fixture, no seed and no table. The hero's chart
 * generated a `Math.random()` walk and labelled it 3.42M. Its third signal
 * asserted "128k requests · p95 142ms · errors 0.011%" for a product with no
 * metrics pipeline at all.
 *
 * Every one of those was defensible in isolation and none of them was true,
 * and a reader comparing two screens would have found the product contradicting
 * itself about how much money it is owed.
 *
 * `portfolio.ts` is the single source these now derive from. This asserts they
 * still do — arithmetic only, no database, so it runs in a second and fails the
 * moment somebody reintroduces a literal.
 *
 *   pnpm check:figures
 */

import {
  AGEING_BUCKETS,
  IN_ARREARS,
  MRR,
  NEEDING_ATTENTION,
  PORTFOLIO,
  PORTFOLIO_COUNT,
  SEATS_CAPACITY,
  SEATS_IN_USE,
  SEATS_ON_CAPPED_PLANS,
  SEATS_UNCAPPED,
  UNCOLLECTED,
  revenueSeries,
} from '../src/lib/console/portfolio';
import { createRequire } from 'node:module';
import type * as ReadModelModule from '../src/lib/console/data';

type ReadModel = typeof ReadModelModule;

/**
 * ⚠ `lib/console/data` OPENS WITH `import 'server-only'`, WHICH THROWS THE
 *   MOMENT ANYTHING OUTSIDE A SERVER RENDER LOADS IT — including this check.
 *
 * That guard is correct and worth keeping: it is what stops a client component
 * pulling the whole read model into the browser bundle. It also means the only
 * way to assert against these fixtures from a script is to satisfy the guard
 * first, which is what this stub does, before the module is required.
 *
 * The alternative was to assert only against `portfolio.ts`, and that would
 * have tested the source agreeing with itself while leaving the question this
 * script exists to answer — do the SCREENS agree — unasked.
 */
function loadReadModel() {
  const req = createRequire(__filename);
  req.cache[req.resolve('server-only')] = {
    id: 'server-only',
    filename: 'server-only',
    loaded: true,
    exports: {},
  } as unknown as NodeJS.Module;
  return req('../src/lib/console/data') as ReadModel;
}

let failures = 0;
const ok = (s: string) => console.log(`  ✓ ${s}`);
const bad = (s: string) => {
  console.log(`  ✗ ${s}`);
  failures += 1;
};
const eq = (label: string, a: unknown, b: unknown) =>
  a === b ? ok(`${label} — ${String(a)}`) : bad(`${label}: ${String(a)} ≠ ${String(b)}`);

async function main() {
  console.log('\nCONSOLE FIGURES · every screen, one source\n');

  const { getOverview, getRevenue, getPlans } = loadReadModel();
  const [overview, revenue, plansModel] = await Promise.all([
    getOverview(),
    getRevenue(),
    getPlans(),
  ]);

  // ── 1 · the debt, across three renderings of it ──────────────────────────
  console.log('1. The debt');
  const bucketTotal = AGEING_BUCKETS.reduce((s, b) => s + b.amount, 0);
  const queueTotal = IN_ARREARS.reduce((s, w) => s + w.arrears.amount, 0);
  eq('ageing buckets sum to the outstanding total', bucketTotal, UNCOLLECTED);
  eq('collection queue sums to the same', queueTotal, UNCOLLECTED);

  const headlineFigure = Number(overview.headline.figure.replace(/[^0-9]/g, ''));
  eq("the hero's headline quotes it", headlineFigure, UNCOLLECTED);
  eq('the revenue queue has a row per debtor', revenue.collections.length, IN_ARREARS.length);

  // ⚠ The failure that started this: debtors who do not exist.
  const ghosts = revenue.collections.filter((c) => !PORTFOLIO.some((w) => w.slug === c.slug));
  if (ghosts.length === 0) ok('every debtor is a real workspace');
  else bad(`${ghosts.length} debtor(s) name no workspace: ${ghosts.map((g) => g.slug).join(', ')}`);

  // ── 1b · the queue. The most actionable list in the product. ────────────
  //
  // ⚠ IT NAMED EIGHT WORKSPACES AND NOT ONE OF THEM EXISTED — a complete
  // second portfolio with its own plans, seats and arrears, every row linking
  // to a slug that resolved to nothing.
  console.log(String.fromCharCode(10) + '1b. The queue');
  const queueGhosts = overview.queue.filter((q) => !PORTFOLIO.some((w) => w.slug === q.slug));
  if (queueGhosts.length === 0)
    ok(`every queue row is a real workspace (${overview.queue.length})`);
  else
    bad(
      `${queueGhosts.length} row(s) name no workspace: ${queueGhosts.map((g) => g.slug).join(', ')}`,
    );

  const RANK = { danger: 0, warning: 1, info: 2, inert: 3 } as const;
  const misordered = overview.queue.findIndex((q, i) => {
    const prev = overview.queue[i - 1];
    return i > 0 && prev !== undefined && RANK[q.severity] < RANK[prev.severity];
  });
  if (misordered === -1) ok('ordered by what it costs to ignore');
  else bad(`row ${misordered} breaks the severity order`);

  const healthy = overview.queue.filter((q) => {
    const w = PORTFOLIO.find((x) => x.slug === q.slug);
    return w?.status === 'active' && q.severity === 'inert';
  });
  if (healthy.length === 0) ok('no healthy workspace is in the shortlist');
  else bad(`${healthy.length} healthy workspace(s) in the queue`);

  // ── 2 · the attention count, which the headline opens with ──────────────
  console.log('\n2. Attention');
  const spelled = overview.headline.lead.match(/^(\w+)/)?.[1] ?? '';
  const WORDS = [
    'No',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
  ];
  eq('the headline spells the attention count', WORDS.indexOf(spelled), NEEDING_ATTENTION);

  const attentionSignal = overview.signals.find((s) => s.id === 'attention');
  eq('the fourth signal repeats it', Number(attentionSignal?.value), NEEDING_ATTENTION);

  // ── 3 · seats. A ratio must be over the population it is a ratio of. ────
  console.log('\n3. Seats');
  eq('capped + uncapped = total in use', SEATS_ON_CAPPED_PLANS + SEATS_UNCAPPED, SEATS_IN_USE);
  if (SEATS_ON_CAPPED_PLANS <= SEATS_CAPACITY) {
    ok(`${SEATS_ON_CAPPED_PLANS} of ${SEATS_CAPACITY} capped seats — not over 100%`);
  } else {
    bad(`${SEATS_ON_CAPPED_PLANS} seats against a capacity of ${SEATS_CAPACITY} — over 100%`);
  }

  // ── 4 · revenue. The hero's chart and the revenue screen's chart. ────────
  console.log('\n4. Revenue');
  const series = revenueSeries();
  eq('twelve months', series.length, 12);
  eq("the last month equals today's MRR", series.at(-1)?.mrr, MRR);

  const drift = series.find((m, i) => {
    if (i === 0) return false;
    const prev = series[i - 1];
    return prev !== undefined && m.mrr - prev.mrr !== m.net;
  });
  if (!drift) ok('every month reconciles: mrr − previous = net');
  else bad(`${drift.month} does not reconcile`);

  const signalCount = overview.signals.length;
  eq('the hero ribbon is four across', signalCount, 4);

  // ── 5 · nothing asserts a metric this product does not collect ──────────
  console.log('\n5. No invented telemetry');
  const invented = overview.signals.filter((s) =>
    /\bp9[59]\b|\bms\b|errors? [0-9]|uptime|requests?\b/i.test(`${s.label} ${s.note}`),
  );
  if (invented.length === 0) ok('no signal claims latency, uptime or a request rate');
  else bad(`${invented.map((s) => s.label).join(', ')} assert telemetry nothing measures`);

  eq('workspace count', PORTFOLIO_COUNT, PORTFOLIO.length);

  // ── 6 · no retired plan survives anywhere in the read models ────────────
  //
  // ⚠ THE LONGEST-RUNNING DEFECT IN THIS CODEBASE. Trial, Starter, Growth and
  // Scale were replaced by Pro / Business / Custom on 24 Aug 2026, and the old
  // names kept turning up: the provisioning modal's plan list AND its default,
  // the plans comparison table, the workspace drawer's price table (which fell
  // through to a default, so every Pro workspace showed KES 28,000), its
  // storage and credential meters, the trial banner's copy, and the overview's
  // plan-mix icon map.
  //
  // Every one of them failed SILENTLY — an unmatched key falls to a fallback,
  // and a fallback that renders is indistinguishable from a value that is
  // right. So the guard is a string search over what the screens actually
  // produce, rather than a promise to remember.
  console.log(String.fromCharCode(10) + '6. No retired plans');
  const RETIRED = ['Starter', 'Growth', 'Scale'];
  const surfaces = JSON.stringify([overview, revenue, plansModel]);
  const survivors = RETIRED.filter((name) => new RegExp(`"[^"]*\b${name}\b[^"]*"`).test(surfaces));
  if (survivors.length === 0) ok('Trial, Starter, Growth and Scale appear nowhere');
  else bad(`retired plan name(s) still rendered: ${survivors.join(', ')}`);

  const planNames = plansModel.plans.map((p) => p.name);
  const expected = ['Business', 'Custom', 'Pro'];
  if (expected.every((n) => planNames.includes(n))) ok(`plans table: ${planNames.join(', ')}`);
  else bad(`plans table names ${planNames.join(', ')}, expected ${expected.join(', ')}`);

  const misaligned = plansModel.rows.filter((r) => r.values.length !== plansModel.plans.length);
  if (misaligned.length === 0) ok('every entitlement row has one value per plan column');
  else
    bad(
      `${misaligned.length} row(s) have the wrong number of values: ${misaligned.map((r) => r.label).join(', ')}`,
    );

  console.log(
    failures === 0
      ? '\nEvery screen is reading the same twelve workspaces.\n'
      : `\n${failures} ${failures === 1 ? 'disagreement' : 'disagreements'} above.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
