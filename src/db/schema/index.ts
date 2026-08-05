/**
 * 05 §1. One file per module, re-exported here. Policies live in
 * `src/db/policies/`, one file per table, applied by migration.
 *
 * THE RULE THAT KEEPS THE TWO IN STEP: every migration that creates a
 * tenant-scoped table must create its policies in the SAME migration.
 * `pnpm check:policies` reads the schema and the policy catalogue and compares
 * them, and it runs before the tests in CI. A tenant-scoped table without a
 * policy fails the build, which means the two can never drift. 04 §9 · 05 §12.
 */

export * from './_shared';
export * from './tenancy';
export * from './identity';
export * from './subscriptions';
export * from './credentials';
export * from './airules';
export * from './seams';
export * from './audit';
