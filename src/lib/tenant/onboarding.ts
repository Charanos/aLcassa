/**
 * Onboarding chrome constants.
 *
 * ⚠ THIS FILE EXISTS BECAUSE A ROUTE HANDLER MAY NOT EXPORT ANYTHING ELSE.
 *
 * `ONBOARDING_DISMISSED_COOKIE` was declared in
 * `app/api/v1/me/onboarding/dismiss/route.ts` and imported from there by the
 * overview page — which reads perfectly well and fails the production build:
 *
 *     Property 'ONBOARDING_DISMISSED_COOKIE' is incompatible with index
 *     signature. Type '"aLcassa_onboarding_dismissed"' is not assignable to
 *     type 'never'.
 *
 * Next.js type-checks every `route.ts` against a closed shape — the HTTP verb
 * handlers plus a fixed set of config keys (`dynamic`, `revalidate`, …) — and
 * ANY other export is an error. `tsc --noEmit` cannot see this, because the
 * constraint lives in the generated `.next/types` files that only exist after
 * a build. It typechecked clean for as long as it took to run one.
 *
 * The value belongs in a plain module either way: the route WRITES the cookie
 * and the overview READS it, so neither owns it.
 */

/**
 * Per-browser, and deliberately not a column yet — see the dismiss handler
 * for what that costs. Dismissal is NOT completion: `getOverview`'s `done`
 * flags are untouched by it.
 */
export const ONBOARDING_DISMISSED_COOKIE = 'aLcassa_onboarding_dismissed';
