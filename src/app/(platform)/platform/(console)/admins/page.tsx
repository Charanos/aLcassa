import type { Metadata } from 'next';
import { IconEyeOff, IconKey, IconShieldLock, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, DataSource, Panel } from '@/components/console/Surface';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { OperatorsBand } from '@/components/console/admins/OperatorsBand';
import { CapabilitiesBand } from '@/components/console/admins/CapabilitiesBand';
import { ENFORCED } from '@/components/console/admins/access';
import { getAdmins } from '@/lib/console/data';
import { getLiveAdmins } from '@/lib/console/liveOperators';

export const metadata: Metadata = { title: 'Admins' };

/** Display the stored operator capabilities that the platform services enforce; do not invent role tiers. */
export default async function AdminsPage() {
  const live = await getLiveAdmins();
  const { admins, invitations } = live ?? (await getAdmins());

  const full = admins.filter((a) => ENFORCED.every((c) => a.capabilities[c.key])).length;
  const mfaKnown = admins.filter((a) => a.mfa !== null);
  const mfaOn = mfaKnown.filter((a) => a.mfa).length;

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Admins' }]}
        title="Admins"
        actions={<InviteControl />}
      />

      <FactStrip label="Platform access at a glance">
        <FactCell
          icon={IconUsers}
          label="Operators"
          value={`${admins.length} ${admins.length === 1 ? 'person' : 'people'}`}
          note="People with access to the platform console."
          source={<DataSource kind={live ? 'live' : 'designed'} />}
        />
        <FactCell
          icon={IconShieldLock}
          label="Full access"
          value={
            admins.length > 0 && full === admins.length ? 'Everyone' : `${full} of ${admins.length}`
          }
          note="Can manage workspaces, edit shared rules, and enter support sessions."
        />
        <FactCell
          icon={IconKey}
          label="Multi-factor"
          value={
            mfaKnown.length === 0 ? 'Status unavailable' : `${mfaOn} of ${mfaKnown.length} enrolled`
          }
          tone={mfaKnown.length > 0 && mfaOn < mfaKnown.length ? 'warning' : 'neutral'}
          note={
            mfaKnown.length === 0
              ? 'Enrolment status is not available in this operator roster.'
              : 'Read from each operator’s sign-in record.'
          }
        />
        <FactCell
          icon={IconEyeOff}
          tone="success"
          label="Customer messages"
          value="Excluded here"
          note="The operator roster does not display customer conversations."
        />
      </FactStrip>

      <OperatorsBand admins={admins} live={live !== null} />
      <CapabilitiesBand admins={admins} />

      {/* The designed roster carries invitations; the live one cannot — see
          `getLiveAdmins`. Shown only when there is something to show. */}
      {invitations.length > 0 ? (
        <div className="mt-12">
          <Panel title="Pending invitations · designed" variant="elevated">
            <ul className="m-0 grid list-none p-0">
              {invitations.map((inv) => (
                <li
                  key={inv.email}
                  className="flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <span className="t-compact truncate" style={{ color: 'var(--text-primary)' }}>
                    {inv.email}
                  </span>
                  <span className="t-caption shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    sent {inv.sentAgo} · expires in {inv.expiresIn}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </ConsolePage>
  );
}

/** Explain beside the control that operator access is currently granted through the database. */
function InviteControl() {
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        disabled
        aria-describedby="invite-reason"
        className="inline-flex h-9 items-center gap-2 rounded-full px-4 whitespace-nowrap"
        style={{
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-sunken)',
          color: 'var(--text-disabled)',
          font: '500 var(--type-compact)/1 var(--font-ui)',
          cursor: 'not-allowed',
        }}
      >
        <IconUserPlus size={15} stroke={1.5} aria-hidden />
        Invite admin
      </button>
      <p
        id="invite-reason"
        className="t-caption max-w-[34ch] sm:text-right"
        style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
      >
        Platform access is granted in the database, not invited — invitations belong to one
        workspace.
      </p>
    </div>
  );
}
