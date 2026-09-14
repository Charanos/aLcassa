/**
 * What a platform admin is allowed to call themselves.
 *
 * ⚠ THIS FILE CARRIES NO DIRECTIVE, AND THAT IS THE ENTIRE REASON IT EXISTS.
 *
 * The rule is needed on both sides of the boundary — the form uses it to decide
 * whether Save is live, the server action uses it because a client-side check
 * is a convenience and never a control — and there are exactly three places it
 * could have lived, two of which are traps:
 *
 *   IN `profile-actions.ts`   `'use server'` permits only async function
 *                             exports. `export const NAME_MAX = 80` beside
 *                             them does not typecheck as a module and fails
 *                             the build.
 *
 *   IN THE CLIENT COMPONENT   the server action importing a value from a
 *                             `'use client'` module receives a client
 *                             REFERENCE PROXY, not the number. It typechecks,
 *                             it lints, it builds, and every comparison against
 *                             it is `undefined` at runtime. 18 §13.
 *
 *   HERE                      a plain module. Both sides import the same
 *                             values, and neither directive is involved.
 *
 * The second trap is the one that has already cost this codebase a shipped
 * regression (`statusHue.ts` exists for the same reason, in the same shape).
 * A constant shared across the server/client boundary belongs in a module with
 * no directive at all.
 */

/** Generous, but bounded. Two characters is a real name in several places. */
export const NAME_MIN = 2;
export const NAME_MAX = 80;

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

/**
 * Normalises and checks a display name.
 *
 * Returns the CANONICAL form on success — trimmed, internal runs of whitespace
 * collapsed — because that is what gets written, and a form that shows
 * `"Brian   Masira"` still in the field after saving `"Brian Masira"` has
 * quietly desynchronised from the database it just wrote to.
 */
export function checkName(raw: string): NameCheck {
  const name = raw.trim().replace(/\s+/g, ' ');

  if (name.length < NAME_MIN) {
    return { ok: false, error: `A name is at least ${NAME_MIN} characters.` };
  }
  if (name.length > NAME_MAX) {
    return { ok: false, error: `A name is at most ${NAME_MAX} characters.` };
  }
  /* A name made entirely of punctuation passes a length check and then appears
     beside every action this person takes in a customer's audit log. */
  if (!/\p{L}/u.test(name)) {
    return { ok: false, error: 'A name needs at least one letter.' };
  }
  return { ok: true, name };
}

/**
 * First and last initial. Two letters, upper case.
 *
 * ⚠ IT IS DUPLICATED FROM `liveOperators.initialsOf` ON PURPOSE, AND THE
 * DUPLICATE IS THE POINT: that one is `server-only` and this one has to run in
 * the browser, so the avatar can follow the field as it is typed rather than
 * waiting for a round trip to show the reader their own initials. The two are
 * the same three lines; if they ever diverge the avatar is wrong for one
 * keystroke, which is the cheapest failure available here.
 */
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first || !last) return '··';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}
