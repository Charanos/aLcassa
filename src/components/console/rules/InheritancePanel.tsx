import type { MasterRulesDoc } from '@/lib/console/data';

/**
 * WHAT HAPPENS AT THE OTHER END OF THE INHERITANCE BOUNDARY.
 *
 * The lede on this page states the model from the platform's side: the floor
 * every workspace inherits. This panel states it from the WORKSPACE's side —
 * what a customer sees when they try to loosen something they cannot. A silent
 * override would be the same feature with none of the trust, and saying so on
 * the platform's own screen is what keeps the promise in front of whoever is
 * about to edit a floor.
 *
 * ⚠ THE BLAST RADIUS IS A COUNT OF WORKSPACES, NOT OF RULES. Publishing does
 * not change one setting; it changes what every inheriting workspace's
 * assistant will do on its next generated reply. The number that matters is
 * how many businesses that is.
 *
 * ⚠ TWO FIGURES THE FIXTURE USED TO CARRY ARE GONE. "Workspace overrides" and
 * "conflicts blocked this month" were drawn numbers with no source: overrides
 * are countable once tenant rule rows exist, and blocked conflicts are not
 * counted anywhere at all — the rejection happens at save time in the tenant's
 * own console and nothing records it. Inventing them on the screen that
 * explains the guarantee would be the worst place in the product to do it.
 */
export function InheritancePanel({ doc }: { doc: MasterRulesDoc }) {
  const floors = doc.fields.filter((f) => f.locked).length;

  return (
    <section
      className="rounded-overlay p-5"
      style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}
    >
      <p className="t-eyebrow mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Inheritance
      </p>
      <p className="t-compact" style={{ color: 'var(--text-secondary)' }}>
        A workspace rule that contradicts a floor is rejected at save time, in their console, naming
        the master rule that blocked it.
      </p>

      <div
        className="mt-3.5 grid gap-2.5 border-t pt-3.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Row label="Workspaces inheriting" value={String(doc.workspaceCount)} />
        <Row label="Fields that are floors" value={`${floors} of ${doc.fields.length}`} />
        <Row label="Published version" value={`v${doc.versionNumber}`} />
      </div>

      <p className="t-caption mt-3.5" style={{ color: 'var(--text-tertiary)' }}>
        How many workspaces override an open field, and how many conflicts were refused, are not
        counted yet. They are shown as absent rather than estimated.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <span className="numeric" style={{ fontSize: 'var(--type-compact)' }}>
        {value}
      </span>
    </div>
  );
}
