import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';
import { ThemeToggle } from './ThemeToggle';
import { CommandHint } from './CommandPalette';
import type { ResolvedTheme } from '@/lib/theme';

/**
 * The sheet chrome.
 *
 * Three things happen here that make a long document navigable: the reading
 * progress rule along the bottom edge, the section nav that highlights as you
 * pass, and the palette. The progress rule is the header's bottom border rather
 * than a separate bar, so it costs no vertical space at all.
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
      className="sticky top-0 z-40 border-b"
      style={{ background: 'var(--surface-page)', borderColor: 'var(--rule-base)' }}
    >
      <div
        className="mx-auto flex h-16 items-center gap-5 px-5 md:px-8"
        style={{ maxWidth: 'var(--surface-width)' }}
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
                  {/* The active underline. A 1px rule rather than a pill,
                      because a pill is a shape this system does not have. */}
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

      {/* Reading progress, scrubbed against document scroll. It sits on the
          header's own bottom edge, so it reads as the rule filling in rather
          than as a separate progress bar bolted on top. */}
      <span
        data-read-progress
        aria-hidden
        className="absolute inset-x-0 -bottom-px block h-px origin-left"
        style={{ background: 'var(--copper-solid)', transform: 'scaleX(0)' }}
      />
    </header>
  );
}
