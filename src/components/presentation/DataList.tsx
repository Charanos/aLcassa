import type { ReactNode } from 'react';

/**
 * One dataset, two presentations.
 *
 * ⚠ THIS IS NOT AN OVERFLOW FIX. A table in a horizontally scrolling box is a
 * table you cannot read on a phone: the row labels leave the screen, the reader
 * loses which column they are in, and the gesture competes with page scroll.
 *
 * So the table DESTRUCTURES. Above `md` it is a real `<table>` with real
 * `<th scope>` associations. Below `md` each row becomes a card whose fields
 * are a `<dl>`, with the column name as the term and the cell as the
 * definition. Same data, same source of truth, two honest presentations, and
 * neither of them scrolls sideways.
 *
 * Both are always in the DOM and one is hidden per breakpoint. That costs a
 * little markup and buys a layout that is correct at every width without
 * measuring anything, which matters because this page is read on a phone in a
 * meeting as often as on a laptop.
 */

export type Column<T> = {
  key: string;
  header: string;
  /** Renders the cell in both presentations. */
  cell: (row: T) => ReactNode;
  width?: string;
  mono?: boolean;
  muted?: boolean;
  /** Promoted to the card's title line on mobile instead of becoming a field. */
  primary?: boolean;
  /** Sits on the card's title line as a trailing chip. */
  badge?: boolean;
  /** Dropped from the card presentation, where it would be noise. */
  hideOnCard?: boolean;
};

export function DataList<T>({
  rows,
  columns,
  caption,
  rowKey,
  empty,
  head,
}: {
  rows: T[];
  columns: Array<Column<T>>;
  caption: string;
  rowKey: (row: T) => string;
  empty?: ReactNode;
  /** Optional custom `<thead>`, for sortable headers. */
  head?: ReactNode;
}) {
  if (rows.length === 0 && empty) {
    return (
      <div
        className="rounded-panel border px-4 py-10 text-center"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--surface-raised)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {empty}
      </div>
    );
  }

  const primary = columns.find((column) => column.primary) ?? columns[0];
  const badges = columns.filter((column) => column.badge);
  const fields = columns.filter(
    (column) => !column.primary && !column.badge && !column.hideOnCard && column !== primary,
  );

  return (
    <>
      {/* ── md and up · the table ─────────────────────────────────────── */}
      <div
        className="hidden overflow-hidden rounded-panel border md:block"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--surface-raised)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <table className="w-full border-collapse text-left">
          <caption className="visually-hidden">{caption}</caption>
          {head ?? (
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="t-micro border-b px-4 py-3 text-[var(--text-tertiary)]"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      background: 'var(--surface-sunken)',
                      width: column.width,
                    }}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b transition-colors duration-[var(--motion-fade)] last:border-b-0 hover:bg-[var(--surface-inset)]"
                style={{ borderColor: 'var(--ink-100)' }}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={[column.mono ? 't-data' : 't-compact', 'px-4 py-3 align-top'].join(
                      ' ',
                    )}
                    style={{ color: column.muted ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── below md · the same rows as cards ─────────────────────────── */}
      <ul className="grid gap-2.5 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-panel border p-4"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--surface-raised)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="t-compact min-w-0 text-[var(--text-primary)]">
                {primary ? primary.cell(row) : null}
              </span>
              {badges.map((column) => (
                <span key={column.key} className="shrink-0">
                  {column.cell(row)}
                </span>
              ))}
            </div>

            {fields.length > 0 ? (
              <dl
                className="mt-3 grid gap-x-4 gap-y-2 border-t pt-3"
                style={{
                  borderColor: 'var(--ink-100)',
                  /*
                   * `minmax(0, 1fr)` RATHER THAN `1fr`, AND IT IS THE WHOLE BUG.
                   *
                   * A `1fr` track is `minmax(auto, 1fr)`, and `auto` refuses to
                   * shrink below its content's minimum. The content here is
                   * file paths like `src/lib/http/pipeline.ts`, which have no
                   * break opportunity, so the track was sized to the longest
                   * path and pushed the card wider than the phone. The card
                   * layout was correct; the track was not.
                   */
                  gridTemplateColumns: 'auto minmax(0, 1fr)',
                }}
              >
                {fields.map((column) => (
                  <div key={column.key} className="contents">
                    <dt className="t-eyebrow self-baseline text-[var(--text-tertiary)]">
                      {column.header}
                    </dt>
                    <dd
                      className={[
                        column.mono ? 't-data' : 't-caption',
                        'min-w-0 self-baseline text-right text-[var(--text-secondary)]',
                      ].join(' ')}
                      /* An identifier must wrap somewhere rather than
                       * truncate: a half-shown path is not usable, and this
                       * is a column a reader copies from. */
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {column.cell(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
