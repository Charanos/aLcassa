import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';
import { ThemeToggle } from '@/components/primitives/ThemeToggle';
import { CommandHint } from './CommandPalette';
import type { ResolvedTheme } from '@/lib/theme';

/**
 * TrackerHeader: Production-grade header for the project delivery tracker.
 * Theme-aware background, flush to top, expandable 1280px width container.
 */
export function TrackerHeader({
  theme,
  sections,
}: {
  theme: ResolvedTheme;
  sections: Array<{ id: string; label: string }>;
}) {
  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200"
      style={{ background: 'var(--surface-page)', borderColor: 'var(--rule-soft)' }}
    >
      <div
        className="mx-auto flex h-16 items-center gap-5 px-5 md:px-8"
        style={{ maxWidth: '1280px' }}
      >
        <Link
          href="#top"
          className="flex shrink-0 items-center gap-2.5 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]"
        >
          <Mark size={20} />
          <span className="t-chip text-[var(--ink-primary)]">Conduit</span>
        </Link>

        <nav aria-label="Sections" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex gap-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  data-nav-link={section.id}
                  data-active="false"
                  className="t-eyebrow group relative block rounded-chip px-2.5 py-2 text-[var(--ink-tertiary)] transition-colors duration-[var(--motion-fade)] hover:text-[var(--copper-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] data-[active=true]:text-[var(--copper-ink)]"
                >
                  {section.label}
                  <span
                    aria-hidden
                    className="absolute inset-x-2.5 -bottom-0.5 h-px origin-left scale-x-0 transition-transform duration-[var(--motion-fade)] group-data-[active=true]:scale-x-100"
                    style={{ background: 'var(--copper-solid)' }}
                  />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="t-eyebrow hidden text-[var(--ink-faint)] xl:block">Rev 3.1</span>
          <CommandHint />
          <ThemeToggle theme={theme} />
        </div>
      </div>

      {/* Reading progress bar line */}
      <span
        data-read-progress
        aria-hidden
        className="absolute inset-x-0 -bottom-px block h-px origin-left"
        style={{ background: 'var(--copper-solid)', transform: 'scaleX(0)' }}
      />
    </header>
  );
}
