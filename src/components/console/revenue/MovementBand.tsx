import { MovementChart } from '../Charts';
import { Panel, SectionHeading } from '../Surface';
import type { MrrMovement } from '@/lib/console/data';
import { Figure } from '@/components/primitives/Figure';

const KES = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

export function MovementBand({ movement }: { movement: MrrMovement[] }) {
  const totals = movement.reduce(
    (acc, m) => ({
      added: acc.added + m.new + m.expansion,
      removed: acc.removed + m.contraction + m.churn,
    }),
    { added: 0, removed: 0 },
  );

  return (
    <section>
      <SectionHeading
        title="Changes in subscription value"
        note="Monthly estimates in KES"
        align="left"
      />
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="New subscriptions, increases, decreases and endings">
          <div className="min-h-[260px]">
            <MovementChart data={movement} />
          </div>
        </Panel>
        <Panel title="Period summary">
          <div className="grid">
            <Figure label="Added value" value={KES.format(totals.added)} />
            <Figure label="Removed value" value={KES.format(totals.removed)} tone="danger" />
            <Figure label="Net change" value={KES.format(totals.added - totals.removed)} strong />
          </div>
          <p className="t-caption mt-4" style={{ color: 'var(--text-secondary)' }}>
            Based on subscription dates and recorded price changes. Earlier values are estimates
            where complete subscription history is unavailable.
          </p>
        </Panel>
      </div>
      <details className="t-caption mt-4">
        <summary className="cursor-pointer">View monthly changes</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Monthly changes in subscription value, KES</caption>
            <thead>
              <tr>
                {['Month', 'New', 'Increases', 'Decreases', 'Endings'].map((label) => (
                  <th className="p-2 font-medium" scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movement.map((m) => (
                <tr key={m.month}>
                  <th scope="row" className="p-2 font-normal">
                    {m.month}
                  </th>
                  {[m.new, m.expansion, m.contraction, m.churn].map((value, i) => (
                    <td key={i} className="p-2 tabular-nums">
                      {KES.format(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
