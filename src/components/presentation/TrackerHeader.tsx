import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';
import { CommandHint } from './CommandPalette';

/**
 * TrackerHeader: Production-grade header for the project delivery tracker.
 * Flush to top, expandable 1280px width container.
 */
export function TrackerHeader({ sections }: { sections: Array<{ id: string; label: string }> }) {
  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200"
      style={{ background: 'var(--surface-base)', borderColor: 'var(--ink-100)' }}
    >
      <div
        className="mx-auto flex h-16 items-center gap-5 px-5 md:px-8"
        style={{ maxWidth: '1280px' }}
      >
        <Link
          href="#top"
          className="flex shrink-0 items-center gap-2.5 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--border-focus)]"
        >
          <Mark size={20} />
          <span className="t-chip text-[var(--text-primary)]">aLcassa</span>
        </Link>

        <nav aria-label="Sections" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex gap-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  data-nav-link={section.id}
                  data-active="false"
                  className="t-eyebrow group relative block rounded-chip px-2.5 py-2 text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fade)] hover:text-[var(--blue-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] data-[active=true]:text-[var(--blue-500)]"
                >
                  {section.label}
                  <span
                    aria-hidden
                    className="absolute inset-x-2.5 -bottom-0.5 h-px origin-left scale-x-0 transition-transform duration-[var(--motion-fade)] group-data-[active=true]:scale-x-100"
                    style={{ background: 'var(--blue-500)' }}
                  />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="t-eyebrow hidden text-[var(--ink-300)] xl:block">Rev 3.1</span>
          <CommandHint />
        </div>
      </div>

      {/* Reading progress bar line */}
      <span
        data-read-progress
        aria-hidden
        className="absolute inset-x-0 -bottom-px block h-px origin-left"
        style={{ background: 'var(--blue-500)', transform: 'scaleX(0)' }}
      />
    </header>
  );
}
