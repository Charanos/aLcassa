import type { StatusBadgeTone } from '@/components/primitives/StatusBadge';
import type { VisitOutcome } from '@/lib/console/liveSupport';

/**
 * How a visit ended, in words and in one tone each. Doc 24 · Stage 5.
 *
 * ⚠ "ENDED BY THE CUSTOMER" IS THE ONLY ACCENT, AND IT IS THE WARNING TONE.
 * Of six endings, it is the one that tells us something we did not already
 * know: somebody watched a stranger in their data and decided to stop it.
 * The page is an accountability ledger, not a productivity report, so the
 * ending that would flatter us — the operator closing their own visit — is
 * drawn plainly.
 */
export const OUTCOME: Record<
  VisitOutcome,
  { label: string; short: string; tone: StatusBadgeTone }
> = {
  open: { label: 'Open now', short: 'Open', tone: 'brand' },
  operator: { label: 'The operator left', short: 'Left', tone: 'neutral' },
  colleague: { label: 'Ended by a colleague', short: 'Colleague', tone: 'neutral' },
  customer: { label: 'The customer ended it', short: 'Customer', tone: 'warning' },
  expired: { label: 'Reached the time limit', short: 'Time limit', tone: 'neutral' },
  superseded: { label: 'Replaced by a new session', short: 'Replaced', tone: 'neutral' },
  break_glass: { label: 'Closed by break glass', short: 'Break glass', tone: 'danger' },
};

export const OUTCOME_ORDER: VisitOutcome[] = [
  'open',
  'customer',
  'operator',
  'colleague',
  'expired',
  'superseded',
  'break_glass',
];

const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Africa/Nairobi',
});
const DAY_LABEL = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Nairobi',
});

export function timeOf(iso: string): string {
  return TIME.format(new Date(iso));
}

/** "Today", "Yesterday", or "Tue 29 Sep" — in Nairobi. */
export function dayLabel(day: string, now = new Date()): string {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' });
  const today = key.format(now);
  const yesterday = key.format(new Date(now.getTime() - 86_400_000));
  if (day === today) return 'Today';
  if (day === yesterday) return 'Yesterday';
  return DAY_LABEL.format(new Date(`${day}T12:00:00+03:00`));
}

export function minutesLabel(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}
