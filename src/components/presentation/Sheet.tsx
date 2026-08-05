/**
 * The presentation surface is drawn as a DRAFTING SHEET, because that is what
 * the design system is: measured rules, annotated dimensions, a title block in
 * the corner, a revision number. 03 §1.
 *
 * These are presentation-only primitives. They consume the same tokens as the
 * product and introduce no new ones, which is the point: the client is looking
 * at the design system while reading about it.
 */

export function SheetSection({
  n,
  title,
  lede,
  aside,
  children,
}: {
  n: string;
  title: string;
  lede?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = `s${n.replace('.', '-')}`;

  return (
    <section
      id={id}
      data-slot="sheet-section"
      className="scroll-mt-20 border-t pt-10 md:pt-14"
      style={{ borderColor: 'var(--rule-strong)' }}
    >
      <div className="flex items-baseline gap-4">
        <span className="t-eyebrow shrink-0 text-[var(--copper-ink)]">{n}</span>
        <h2 className="t-heading text-[var(--ink-primary)]">{title}</h2>
        <span
          aria-hidden
          className="hidden h-px flex-1 self-center md:block"
          style={{ background: 'var(--rule-soft)' }}
        />
        {aside ? <span className="t-eyebrow hidden text-[var(--ink-faint)] md:block">{aside}</span> : null}
      </div>

      {lede ? (
        <p
          className="t-lede mt-4 text-[var(--ink-secondary)]"
          style={{ maxWidth: 'var(--measure-prose)' }}
        >
          {lede}
        </p>
      ) : null}

      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Panel({
  children,
  className,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  /** A left rule in a hue, for a panel that carries a state. One accent per
   *  surface: if a panel needs two, the surface is doing too much. */
  tone?: 'copper' | 'ochre' | 'verdigris' | 'slate' | 'oxide';
}) {
  const rule = tone ? `var(--${tone === 'copper' ? 'copper' : tone}-rule)` : undefined;

  return (
    <div
      data-slot="panel"
      className={['rounded-panel border p-5', className].filter(Boolean).join(' ')}
      style={{
        background: 'var(--surface-raised)',
        borderColor: 'var(--rule-base)',
        ...(rule ? { borderLeft: `3px solid ${rule}` } : {}),
      }}
    >
      {children}
    </div>
  );
}

/** A key-and-value pair in the title-block idiom. Label in micro caps above,
 *  value in mono below. Used across the sheet header and the fact bands. */
export function Fact({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div data-slot="fact">
      <dt className="t-eyebrow text-[var(--ink-faint)]">{k}</dt>
      <dd className="t-data mt-1.5" style={{ color: tone ?? 'var(--ink-primary)' }}>
        {v}
      </dd>
    </div>
  );
}

/** A table that scrolls inside its own container rather than pushing the page
 *  sideways. Sticky header, hairline rows, no zebra, mono in data columns. */
export function SheetTable({
  columns,
  children,
  caption,
}: {
  columns: string[];
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <div
      className="overflow-x-auto rounded-panel border"
      style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-raised)' }}
    >
      <table className="w-full border-collapse text-left">
        {caption ? <caption className="visually-hidden">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="t-micro border-b px-4 py-3 text-[var(--ink-tertiary)]"
                style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-sunken)' }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <tr
      className="border-b last:border-b-0 hover:bg-[var(--surface-hover)]"
      style={{ borderColor: 'var(--rule-soft)' }}
    >
      {children}
    </tr>
  );
}

export function Cell({
  children,
  mono,
  muted,
  width,
}: {
  children: React.ReactNode;
  mono?: boolean;
  muted?: boolean;
  width?: string;
}) {
  return (
    <td
      className={[mono ? 't-data' : 't-compact', 'px-4 py-3 align-top'].join(' ')}
      style={{
        color: muted ? 'var(--ink-secondary)' : 'var(--ink-primary)',
        ...(width ? { width } : {}),
      }}
    >
      {children}
    </td>
  );
}
