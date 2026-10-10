import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';

/** Shared client navigation across the tracker and its supporting records. */
export function TrackerNavigation({
  current,
}: {
  current: 'verification' | 'security' | 'documents';
}) {
  return (
    <nav
      aria-label="Project navigation"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[var(--border-subtle)] pb-5"
    >
      <Link
        href="/project-tracker"
        className="t-compact mr-auto inline-flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <Mark size={20} /> Project tracker
      </Link>
      {(
        [
          ['verification', 'Verification', '/project-tracker/verification'],
          ['security', 'Dependency review', '/project-tracker/security'],
          ['documents', 'Documents', '/project-tracker#documents'],
        ] as const
      ).map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          aria-current={current === key ? 'page' : undefined}
          className={`t-caption py-1 focus-visible:outline-2 focus-visible:outline-offset-4 ${current === key ? 'text-[var(--text-action)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
