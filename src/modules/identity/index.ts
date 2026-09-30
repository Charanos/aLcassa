/**
 * 04 §3 · 11 §6. The only file another module may import.
 *
 * `identity` owns the shell payload: the one round trip 07 §3 specifies for
 * rendering a signed-in surface. It reads from several modules and owns none
 * of their meaning.
 */

export { loadMe } from './me';
export { updateOwnProfile } from './profile';
export type { Me } from './me';
export { endSupportVisit } from './supportVisit';
