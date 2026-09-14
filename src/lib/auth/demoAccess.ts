/**
 * ⚠ THE DEMO BYPASS. IT IS NOW OFF EVERYWHERE UNLESS SOMEBODY TURNS IT ON.
 *
 * `/api/demo` sets a session cookie for the console or the workspace WITHOUT
 * AUTHENTICATING ANYONE. It existed so the client could walk through both
 * applications during review before any account existed, and while every screen
 * read from a mock seam that was a reasonable trade.
 *
 * ⚠ THE CONDITION THIS FILE WAS WAITING FOR HAS ARRIVED.
 *
 * The previous version of this comment said: "M2 is the milestone that stops it
 * being reasonable. Once the resolvers in `lib/auth/resolve.ts` are wired behind
 * those screens, a cookie handed out by an unauthenticated GET is the difference
 * between a demo and an open door to the owner console — and the link to it sits
 * on the public sign-in page."
 *
 * The resolvers are wired, and `pnpm db:seed` now creates a real account that
 * can sign in (19 §12). So the bypass has stopped buying anything and kept all
 * of its cost.
 *
 * ⚠ AND IT WAS ACTIVELY CAUSING A BUG, WHICH IS THE PART WORTH RECORDING.
 *
 * The cookie it sets is the literal string `demo_platform_session_active` — not
 * a session id, because there is no session. `middleware.ts` admits any request
 * carrying the platform cookie, so that string got a reader all the way into the
 * console; every live reader then tried to resolve it, found nothing, and fell
 * back to the designed fixture. That is exactly the half-signed-out state
 * documented in 19 §10: a console rendering invented data as somebody's real
 * account, with every control failing on click.
 *
 * The banner added in that pass makes the state honest. Removing the thing that
 * produced it is better.
 *
 * ⚠ WHAT CHANGED HERE: the development default. It used to return true whenever
 * `NODE_ENV === 'development'`, so the bypass was on for every local run and the
 * doors were on every sign-in page. Now there is one condition, and it is
 * explicit in every environment including this one.
 *
 * ⚠ HOW TO REMOVE IT COMPLETELY, when that is wanted. Four deletions, no other
 * edits, and nothing else imports any of them:
 *
 *   1. this file
 *   2. `src/app/api/demo/route.ts`
 *   3. `src/components/access/DemoDoors.tsx`
 *   4. the `{demoAccessEnabled() ? <DemoDoors /> : null}` line in
 *      `(access)/sign-in/page.tsx`
 *
 * It is kept for now because a review deployment may still want it, and turning
 * it back on is one environment variable rather than a revert.
 */
export function demoAccessEnabled(): boolean {
  return process.env.ALLOW_DEMO_ACCESS === 'true';
}
