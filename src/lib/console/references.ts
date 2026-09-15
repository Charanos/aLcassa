/**
 * THE CONSOLE'S REFERENCE NUMBERS, IN ONE GRAMMAR.
 *
 * ⚠ THERE WERE THREE SHAPES AND NO RULE.
 *
 * The billing tab generated `INV-202609-0012`; the collection queue carried
 * hand-written `INV-2026-0688`; the support dialog produced
 * `TKT-20260915-001`. Three different period widths, two different separators'
 * worth of meaning, and a four-digit suffix taken from the tail of a seeded
 * UUID — which for every workspace in the fixture is a run of zeros with one or
 * two significant digits on the end. A reader shown two of these side by side
 * cannot tell they come from the same product.
 *
 * Worse, the invoice number a customer would be chased for in the collection
 * queue was NOT the number their own billing tab displayed. They were written
 * in different files by different hands, so the console quoted two references
 * for one debt.
 *
 * One grammar, and one generator per kind:
 *
 *     ⟨KIND⟩-⟨PERIOD⟩-⟨SEQUENCE⟩
 *
 *   KIND      Three uppercase letters. `INV` an invoice, `TKT` a support
 *             ticket. Read aloud without spelling it out.
 *   PERIOD    The calendar unit the sequence belongs to, most significant
 *             first, two digits per unit. Invoices bill monthly, so `YYMM`.
 *             Tickets queue daily, so `YYMMDD`. The width tells you the
 *             cadence without being told.
 *   SEQUENCE  What distinguishes one reference from another WITHIN that
 *             period. For an invoice it is the workspace's account number;
 *             for a ticket it is its place in the day's queue.
 *
 * Both sort correctly as plain text, both fit a table column at 12px mono, and
 * neither degenerates into zeros.
 *
 * ⚠ NO DIRECTIVE AT THE TOP OF THIS FILE, DELIBERATELY. `actions.ts` is
 * `'use server'` and may export nothing but async functions, so a helper
 * cannot live there; a `'use client'` module imported for a VALUE by a server
 * component yields a reference proxy rather than the function. A shared
 * constant belongs in a module that declares neither. Doc 18 §13.
 */

/** Two digits, so a period never loses its leading zero. Sept is `09`. */
const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * `YYMM` for the month a date falls in. The billing period.
 */
export function monthPeriod(date: Date): string {
  return `${pad2(date.getFullYear() % 100)}${pad2(date.getMonth() + 1)}`;
}

/**
 * `YYMMDD` for the day a date falls on. The ticket queue's period.
 *
 * ⚠ NAIROBI, NOT THE SERVER'S CLOCK. A ticket raised at 01:30 EAT is raised
 * today for the operator reading it, and the day in the reference is the day
 * they will search for. UTC would file it under yesterday for two and a half
 * hours out of every twenty-four.
 */
export function dayPeriod(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts.replace(/-/g, '');
}

/**
 * A workspace's account number: four digits, stable, and never a run of zeros.
 *
 * ⚠ NOT THE TAIL OF THE UUID, WHICH IS WHAT IT USED TO BE. The seeded ids run
 * `…000000000001` to `…000000000012`, so the last four hex characters are
 * `0001` through `0012` — twelve references that differ in their final
 * character and look, at a glance, like a formatting bug. They also leak the
 * insertion order of the seed onto a document a customer reads.
 *
 * An FNV-1a hash of the slug instead, folded into 1000–9999. It is
 * deterministic (the same workspace always bills under the same account), it
 * is derived from the name the customer already knows rather than from an
 * internal key, and it occupies the whole four-digit range so no two
 * workspaces' numbers look like variants of each other.
 *
 * ⚠ FOUR DIGITS IS NOT A UNIQUENESS GUARANTEE and is not asked to be. The
 * reference is unique because the PERIOD is part of it and a real ledger
 * assigns the number on issue; this function exists so the fixture reads like
 * that ledger rather than like a UUID with a prefix.
 */
export function accountNumber(slug: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return String(1000 + (hash % 9000));
}

/**
 * `INV-2609-4471` — account 4471's invoice for September 2026.
 *
 * The same workspace's three most recent invoices differ only in their period,
 * which is what a statement looks like and what makes a run of them scannable.
 */
export function invoiceReference(slug: string, issued: Date): string {
  return `INV-${monthPeriod(issued)}-${accountNumber(slug)}`;
}

/**
 * `TKT-260915-018` — the eighteenth support session opened on 15 Sep 2026.
 *
 * ⚠ THE SEQUENCE IS A COUNT OF WHAT THE PLATFORM LOG ALREADY HOLDS, taken at
 * the moment the dialog opens. It is a queue position, not a primary key: two
 * operators opening the dialog in the same second would be offered the same
 * number, and the log — which is append-only and carries its own ids — is what
 * actually distinguishes the two sessions. Presenting it as uneditable text
 * rather than as a typed field is what keeps that honest; see
 * `StartSessionDialog`.
 */
export function supportReference(sequence: number, when: Date = new Date()): string {
  return `TKT-${dayPeriod(when)}-${String(sequence).padStart(3, '0')}`;
}

/**
 * The separator between a reference and the prose that follows it, in the one
 * place a reference is written into a sentence the customer reads.
 */
export const REFERENCE_SEPARATOR = ' · ';
