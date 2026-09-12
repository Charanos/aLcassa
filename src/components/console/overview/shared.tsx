/**
 * ⚠ ONE DEFINITION, TWO IMPORT PATHS.
 *
 * `BandLink` moved into `Surface.tsx` when the second surface needed it —
 * every band on every console screen ends in one, so it is surface vocabulary
 * rather than something the overview owns. This file stays as the path the
 * overview's bands already import from, and re-exports rather than
 * redeclaring: two copies of a link style is how the console ends up with two
 * link styles.
 */
export { BandLink } from '../Surface';
