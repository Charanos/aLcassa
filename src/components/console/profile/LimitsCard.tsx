import Link from '@/components/structure/NavigationLink';
import { IconArrowRight, IconEyeOff } from '@tabler/icons-react';
import { RailEyebrow } from '@/components/console/profile/shared';

/** States the customer-access boundary independently of the operator capability list. */
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
        Customer data requires a scoped support visit. During a visit, permitted reads and writes
        are recorded in the customer&rsquo;s activity log. Credential secrets and member identity
        changes remain unavailable.
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
