import {
  IconBrandWhatsapp,
  IconDatabase,
  IconRobot,
  IconServer2,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import type { DayState, HealthModel, Incident, Service, ServiceKey } from '@/lib/console/data';

/**
 * The health page's shared vocabulary: one glyph per service, one ink per day
 * state, and the handful of derivations more than one band needs.
 *
 * ⚠ DERIVED HERE ONCE SO THE BANDS CANNOT DISAGREE. The slab's composite strip,
 * each service card's strip, and the incident log all answer "what happened on
 * the 8th". If each band worked that out for itself, the day a rule changed
 * (say, a degradation over an hour starts counting as an outage) the slab
 * would follow it and the cards would not.
 */

export const SERVICE_ICON: Record<ServiceKey, TablerIcon> = {
  api: IconServer2,
  db: IconDatabase,
  bot: IconRobot,
  channel: IconBrandWhatsapp,
};

/**
 * Day ink, on the page ground.
 *
 * ⚠ A HEALTHY DAY IS QUIET ON PURPOSE. The strips were solid `--success-fg`:
 * four cards of thirty saturated green bars, a hundred and twenty loud marks
 * whose only message was "nothing happened". The one amber bar among them —
 * the thing the strip exists to show — had to compete with all of it. Ok days
 * are now a green wash that reads as green at a glance and recedes beside a
 * real event, so the eye lands where something happened.
 */
export const DAY_INK: Record<DayState, string> = {
  ok: 'color-mix(in oklab, var(--success-fg) 34%, var(--surface-inset))',
  degraded: 'var(--warning-fg)',
  down: 'var(--danger-fg)',
};

/** The same three states against the obsidian slab. */
export const DAY_INK_INVERSE: Record<DayState, string> = {
  ok: 'color-mix(in oklab, var(--chrome-success) 30%, transparent)',
  degraded: 'var(--chrome-warning)',
  down: 'var(--chrome-danger)',
};

export const DAY_WORD: Record<DayState, string> = {
  ok: 'Operational',
  degraded: 'Degraded',
  down: 'Outage',
};

export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * A service's verdict, as a word a person would use.
 *
 * "1 degraded day" rather than "99.98%": the percentage cannot tell one bad
 * afternoon from a wobble every third day, and the word can.
 */
export function serviceVerdict(s: Service): { tone: Tone; label: string } {
  const down = s.days.filter((d) => d === 'down').length;
  const slow = s.days.filter((d) => d === 'degraded').length;
  if (down > 0) return { tone: 'danger', label: down === 1 ? 'Outage' : `${down} outages` };
  if (slow > 0) return { tone: 'warning', label: `${slow} slow ${slow === 1 ? 'day' : 'days'}` };
  return { tone: 'success', label: 'Held' };
}

/** The worst thing that happened to any service, per day. */
export function compositeDays(services: Service[]): DayState[] {
  const length = services[0]?.days.length ?? 0;
  return Array.from({ length }, (_, i) => {
    const states = services.map((s) => s.days[i]);
    if (states.includes('down')) return 'down';
    if (states.includes('degraded')) return 'degraded';
    return 'ok';
  });
}

/**
 * The incidents that fall on one day of the window, optionally for one service.
 *
 * Joined on `day` — the same Nairobi-calendar label the window uses — rather
 * than recomputed from a timestamp, so there is exactly one place that decides
 * which day an incident belongs to.
 */
export function incidentsOn(
  model: Pick<HealthModel, 'incidents' | 'window'>,
  index: number,
  service?: ServiceKey,
): Incident[] {
  const day = model.window[index];
  return model.incidents.filter((i) => i.day === day && (!service || i.service === service));
}

/** Plain-English count for the editorial lines. */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const TENS: Record<number, string> = { 20: 'twenty', 30: 'thirty', 60: 'sixty', 90: 'ninety' };
export function spell(n: number): string {
  return WORDS[n] ?? TENS[n] ?? String(n);
}

/** Capitalise the first letter; used where a spelled count opens a sentence. */
export function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The ink a verdict tone paints in, on the page ground. */
export const TONE_INK: Record<Tone, string> = {
  success: 'var(--success-fg)',
  warning: 'var(--warning-fg)',
  danger: 'var(--danger-fg)',
  neutral: 'var(--text-tertiary)',
};
