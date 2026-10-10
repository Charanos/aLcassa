import { PROJECT_TIMING } from '@/lib/presentation/engagement';

const dateLabel = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${value}T00:00:00Z`))
    : 'To confirm';

/** Report calendar time from confirmed dates; never infer kickoff from the brief. */
export function ProjectSchedule() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const daysBetween = (start: string, end: string) =>
    Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
  const elapsed = PROJECT_TIMING.kickoffDate
    ? daysBetween(PROJECT_TIMING.kickoffDate, today)
    : null;
  const remaining = PROJECT_TIMING.targetDate
    ? daysBetween(today, PROJECT_TIMING.targetDate)
    : null;
  const facts = [
    { label: 'Kickoff', value: dateLabel(PROJECT_TIMING.kickoffDate) },
    { label: 'Target handover', value: dateLabel(PROJECT_TIMING.targetDate) },
    {
      label: 'Calendar time elapsed',
      value:
        elapsed === null
          ? 'Awaiting kickoff date'
          : elapsed < 0
            ? `Starts in ${Math.abs(elapsed)} days`
            : `${elapsed} days`,
    },
    {
      label: 'Time to target',
      value:
        remaining === null
          ? 'Awaiting target date'
          : remaining < 0
            ? `${Math.abs(remaining)} days past target`
            : `${remaining} days remaining`,
    },
  ];
  return (
    <div className="overflow-hidden rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-4 sm:px-6">
        <p className="t-compact font-medium">{PROJECT_TIMING.plannedWeeks} working weeks planned</p>
        <p className="t-caption text-[var(--text-secondary)]">
          {PROJECT_TIMING.supportDays}-day support window after accepted handover
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-6 px-4 py-6 sm:grid-cols-2 sm:px-6">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="t-caption text-[var(--text-secondary)]">{fact.label}</dt>
            <dd className="t-compact mt-2 font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <p className="t-caption border-t border-[var(--border-subtle)] px-4 py-4 text-[var(--text-secondary)] sm:px-6">
        {PROJECT_TIMING.kickoffDate && PROJECT_TIMING.targetDate
          ? `Calendar counts update daily in Nairobi time. Milestone week ranges show the agreed sequence; progress is verified separately.`
          : 'Elapsed calendar time updates daily in Nairobi time. The handover deadline awaits confirmation; the nine-working-week estimate is shown separately.'}
      </p>
    </div>
  );
}
