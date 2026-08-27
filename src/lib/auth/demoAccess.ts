/**
 * ⚠ THE DEMO BYPASS, AND WHY IT IS NOW AN OPT-IN RATHER THAN ALWAYS ON.
 *
 * `/api/demo` sets a session cookie for the console or the workspace WITHOUT
 * AUTHENTICATING ANYONE. It exists so the client can walk through both
 * applications during review without accounts existing yet, and while every
 * screen reads from a mock seam that is a reasonable trade.
 *
 * M2 is the milestone that stops it being reasonable. Once the resolvers in
 * `lib/auth/resolve.ts` are wired behind those screens, a cookie handed out
 * by an unauthenticated GET is the difference between a demo and an open door
 * to the owner console — and the link to it sits on the public sign-in page.
 *
 * So it is gated. Not deleted, because the review deployment genuinely needs
 * it, and not gated on `NODE_ENV`, because Vercel sets that to `production`
 * for preview deployments too — which would have silently removed the demo
 * from the very environment the client uses to look at the work.
 *
 * `ALLOW_DEMO_ACCESS=true` is therefore an EXPLICIT, PER-ENVIRONMENT
 * decision. Local development has it on by default; anywhere else, somebody
 * has to have typed it into that environment's settings, which is exactly the
 * bar an access bypass should have to clear.
 *
 * ⚠ IT MUST BE REMOVED FROM THE ENVIRONMENT THAT HOLDS REAL CUSTOMER DATA.
 *   Tracked as a condition of the M6 handover.
 */
export function demoAccessEnabled(): boolean {
  if (process.env.ALLOW_DEMO_ACCESS === 'true') return true;
  // Local development, where there is no real data to reach.
  return process.env.NODE_ENV === 'development';
}
