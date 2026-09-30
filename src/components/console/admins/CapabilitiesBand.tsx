import {
  IconCheck,
  IconEyeOff,
  IconMinus,
  IconReceiptRefund,
  IconShieldCheck,
} from '@tabler/icons-react';
import { IconTile } from '@/components/primitives/IconTile';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';
import { Panel, SectionHeading } from '../Surface';
import type { Admin } from '@/lib/console/data';
import { BY_CONSTRUCTION, ENFORCED } from './access';

/**
 * CAPABILITIES. What each operator can do, and how that is guaranteed.
 *
 * ⚠ COLUMNS ARE PEOPLE NOW, NOT ROLES. The matrix used to have three columns —
 * Owner, Admin, Support — for roles that exist nowhere in the database. The
 * one operator on the platform was labelled `platform_admin`, which was none of
 * them, so the page could not tell its own reader which column was theirs.
 * The columns are the operators on the list, and the cells are their stored
 * capabilities.
 *
 * ⚠ AND THE CELLS ARE ENFORCED, WHICH THEY WERE NOT. Until doc 23 no code read
 * the three capability columns: the matrix was an accurate picture of settings
 * that did nothing. Every enforced row names its column, so the claim can be
 * checked against the schema, and the panel beside the matrix says where the
 * check runs.
 */
export function CapabilitiesBand({ admins }: { admins: Admin[] }) {
  const first = (name: string) => name.split(/\s+/)[0] ?? name;
  const cols = `minmax(260px, 1fr) repeat(${admins.length}, 92px)`;

  const rows: Array<{
    label: string;
    note: string;
    mono?: string;
    cell: (a: Admin) => boolean;
    divider?: boolean;
  }> = [
    {
      label: BY_CONSTRUCTION[0]?.label ?? '',
      note: BY_CONSTRUCTION[0]?.why ?? '',
      cell: () => true,
    },
    ...ENFORCED.map((c) => ({
      label: c.label,
      note: c.detail,
      mono: `enforced · ${c.column}`,
      cell: (a: Admin) => a.capabilities[c.key],
    })),
    ...BY_CONSTRUCTION.slice(1).map((r, i) => ({
      label: r.label,
      note: r.why,
      cell: () => r.everyone,
      divider: i === 0,
    })),
  ];

  return (
    <section aria-labelledby="admins-capabilities">
      <SectionHeading
        title="Capabilities"
        note="What each operator can do, and how that is guaranteed."
        align="right"
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title="Who can do what" variant="elevated" flush>
          <div className="overflow-x-auto px-1">
            <div role="table" aria-label="Operator capabilities" className="min-w-fit">
              <div
                role="row"
                className="grid items-end gap-x-2 border-b px-4 pb-3"
                style={{ gridTemplateColumns: cols, borderColor: 'var(--border-subtle)' }}
              >
                <span role="columnheader" className="sr-only">
                  Capability
                </span>
                {admins.map((a) => (
                  <span
                    key={a.id}
                    role="columnheader"
                    className="truncate text-center font-mono text-2xs tracking-[0.1em] uppercase"
                    style={{ color: a.you ? 'var(--blue-600)' : 'var(--text-tertiary)' }}
                    title={a.name}
                  >
                    {a.you ? 'You' : first(a.name)}
                  </span>
                ))}
              </div>

              {rows.map((r) => (
                <div
                  key={r.label}
                  role="row"
                  className="grid items-center gap-x-2 px-4 py-3.5"
                  style={{
                    gridTemplateColumns: cols,
                    borderTop: r.divider ? '2px solid var(--border-subtle)' : undefined,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div role="rowheader" className="min-w-0 pr-4">
                    <p
                      className="t-compact"
                      style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                    >
                      {r.label}
                    </p>
                    <p
                      className="t-caption mt-0.5"
                      style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
                    >
                      {r.note}
                    </p>
                    {r.mono ? (
                      <p
                        className="mt-1 font-mono text-2xs tracking-[0.04em]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {r.mono}
                      </p>
                    ) : null}
                  </div>
                  {admins.map((a) => {
                    const yes = r.cell(a);
                    return (
                      <span key={a.id} role="cell" className="grid place-items-center">
                        <span
                          className="grid size-6 place-items-center rounded-full"
                          style={{
                            background: yes ? 'var(--success-bg)' : 'transparent',
                            color: yes ? 'var(--success-fg)' : 'var(--text-disabled)',
                          }}
                        >
                          {yes ? (
                            <IconCheck size={14} stroke={2.25} aria-label="Yes" />
                          ) : (
                            <IconMinus size={14} stroke={2} aria-label="No" />
                          )}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="How it is guaranteed" variant="elevated">
          <ul className="m-0 grid list-none gap-5 p-0">
            <Guarantee icon={IconShieldCheck} title="Checked where the change is made">
              Every call that needs a capability reads it from the operator&rsquo;s record inside
              its own transaction. Revoking one takes effect on the next request, not at the next
              sign-in.
            </Guarantee>
            <Guarantee icon={IconReceiptRefund} title="A refusal writes nothing">
              The audit row and the change share a transaction, so a refused call leaves neither —
              the ledger never records an action that did not happen.
            </Guarantee>
            <Guarantee icon={IconEyeOff} title="No operator bypasses isolation">
              Operators reach a workspace only through a support session, under the same row-level
              security its own staff work under, logged to its own activity.
            </Guarantee>
          </ul>
        </Panel>
      </div>
    </section>
  );
}

function Guarantee({
  icon,
  title,
  children,
}: {
  icon: typeof IconShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3.5">
      <IconTile icon={icon} size="sm" />
      <div className="min-w-0">
        <p
          style={{
            font: '500 var(--type-compact)/1.4 var(--font-ui)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </p>
        <p
          className="t-caption mt-1"
          style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
        >
          {children}
        </p>
      </div>
    </li>
  );
}

export function CapabilitiesBandSkeleton() {
  return (
    <SkeletonGroup label="Loading capabilities" className="block">
      <SkeletonSectionHeading align="right" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title="Who can do what" variant="elevated" flush>
          <div className="grid">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-6 px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="flex-1">
                  <SkeletonBar width={`${54 - (i % 3) * 8}%`} height={13} />
                  <SkeletonBar width={`${78 - (i % 4) * 9}%`} height={11} className="mt-1.5" />
                </div>
                <SkeletonBar width={24} height={24} radius="rounded-full" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="How it is guaranteed" variant="elevated">
          <div className="grid gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3.5">
                <SkeletonBar width={28} height={28} radius="rounded-panel" />
                <div className="flex-1">
                  <SkeletonBar width="60%" height={13} />
                  <SkeletonBar width="92%" height={11} className="mt-1.5" />
                  <SkeletonBar width="80%" height={11} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </SkeletonGroup>
  );
}
