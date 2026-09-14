/**
 * THE FIVE WORKSPACE STATUS COLOURS. One definition, read from both sides.
 *
 * ⚠ THIS FILE HAS NO `'use client'` AND NO `server-only`, DELIBERATELY, AND
 * THAT IS THE ENTIRE REASON IT EXISTS.
 *
 * The map lived in `Charts.tsx` and the portfolio legend imported it from
 * there. It typechecked, it linted, it built — and every legend dot rendered
 * GREY, because a server component importing a value from a `'use client'`
 * module does not receive the value. React replaces every export of a client
 * module with a client-reference proxy, so `STATUS_HUE[status]` was `undefined`
 * and each dot fell through to its neutral default.
 *
 * That is a silent failure in the worst place: the legend is the only reason
 * `03 §24` permits the donut to use semantic hues at all. A legend whose dots
 * are all grey withdraws that permission while still looking like it grants it.
 *
 * The pairing rule, worth stating once because it cuts both ways:
 *
 *   `server-only` module → a client component cannot import it. Caught at BUILD.
 *   `'use client'` module → a server component gets proxies, not values.
 *                           Caught by NOBODY. It renders wrong.
 *
 * Shared constants therefore belong in a module with neither directive.
 *
 * ⚠ THEY ARE TOKEN NAMES, NOT RESOLVED VALUES. The legend hands them to CSS,
 * which resolves them. `StatusMixChart` cannot — an SVG presentation attribute
 * does not reliably resolve `var()` (`03 §24`) — so the chart re-reads the same
 * five meanings through `useTokens` and the two are kept in step by this
 * comment and the test below it in the same file.
 */
export const STATUS_HUE = {
  active: 'var(--success-fg)',
  trial: 'var(--blue-400)',
  'past due': 'var(--warning-fg)',
  suspended: 'var(--danger-fg)',
  pending: 'var(--ink-300)',
} as const;

export type StatusHueKey = keyof typeof STATUS_HUE;

/**
 * The colour for a status, or the neutral when it is one this map does not
 * know.
 *
 * ⚠ IT TAKES A WIDE STRING ON PURPOSE. `WorkspaceStatus` is the closed set
 * today, but the legend renders whatever the read model hands it, and a status
 * added to the schema without a colour here should render neutral rather than
 * crash a server render.
 */
export function statusHue(status: string): string {
  return (STATUS_HUE as Record<string, string>)[status] ?? 'var(--ink-300)';
}
