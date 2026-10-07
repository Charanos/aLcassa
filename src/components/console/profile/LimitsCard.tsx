import Link from '@/components/structure/NavigationLink';
import { IconArrowRight, IconEyeOff } from '@tabler/icons-react';
import { RailEyebrow } from '@/components/console/profile/shared';

/**
 * THE CEILING. The panel with no equivalent anywhere else in the console.
 *
 * ⚠ THIS IS THE ACTUAL POINT OF THIS SCREEN, NOT THE FORM.
 *
 * Every other surface under `/platform` states what an admin CAN reach. This is
 * the one that states the limit from the admin's own point of view, which is
 * the more persuasive direction for a security review: the person with the most
 * access on the platform is shown, on their own settings page, the things that
 * access does not include.
 *
 * ⚠ IT IS DELIBERATELY THE ONE UNCARDED-LOOKING BLOCK ON A CARDED PAGE, and
 * that is not a violation of 03 §26 — it is still a card, with the same radius
 * and the same border, on a sunken ground instead of a raised one. §26's rule
 * is that a carded panel must not sit beside an UNCARDED one, because one of
 * them reads as having failed to render. Two cards on different grounds read as
 * two cards, and the ground change is doing the one job worth spending it on:
 * this block is a statement rather than a setting, and nothing in it is
 * actionable except the link out.
 */
export function LimitsCard() {
  return (
    <section
      className="rounded-overlay p-5"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-sunken)',
        boxShadow: 'var(--neu-inset)',
      }}
    >
      <RailEyebrow>
        <span className="inline-flex items-center gap-1.5">
          <IconEyeOff size={12} stroke={1.75} aria-hidden />
          What you cannot do
        </span>
      </RailEyebrow>

      <p className="t-compact" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}>
        Read a customer&rsquo;s message bodies, see credential values, or act inside a workspace. A
        support session grants sight, never a master key.
      </p>

      <Link
        href="/platform/support-sessions"
        className="t-compact group mt-4 inline-flex items-center gap-1.5 rounded-chip transition-colors hover:text-[var(--blue-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
        style={{ color: 'var(--blue-500)', fontWeight: 500 }}
      >
        Your session history
        <IconArrowRight
          size={13}
          stroke={2}
          aria-hidden
          className="transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        />
      </Link>
    </section>
  );
}
