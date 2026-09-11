import type { Metadata } from 'next';
import {
  IconAlertTriangle,
  IconCheck,
  IconCrown,
  IconDotsVertical,
  IconLock,
  IconMail,
  IconMinus,
  IconShieldCheck,
  IconShieldLock,
  IconUserPlus,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { IconHelpCircle } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, Panel } from '@/components/console/Surface';
import { getAdmins, type AdminRole } from '@/lib/console/data';
import { getLiveAdmins } from '@/lib/console/liveOperators';

export const metadata: Metadata = { title: 'Admins' };

/**
 * Platform operators. `Admins.dc.html`.
 *
 * ⚠ THE STRONGEST STATEMENT ON THIS PAGE IS A ROW OF CROSSES.
 *
 * The capability matrix ends with two rows — "read a customer message body"
 * and "read a credential value" — where every column is a dash, including the
 * owner's. That is the product's security posture written as a table: the
 * platform team can provision, suspend, re-plan and support, and cannot read
 * the thing customers actually care about. Stating it as an absence is
 * stronger than any paragraph claiming it.
 *
 * The footer makes the same point from the other side: admins bypass no RLS
 * policy, and reach a workspace only through a logged support session. Those
 * two facts are what make the whole console defensible in a security review.
 *
 * ⚠ "KEEP THIS LIST SHORT ENOUGH TO NAME FROM MEMORY" is the lede, and it is
 * doing real work. There is no pagination, no search and no bulk action here
 * on purpose — every affordance that makes a long list bearable also makes a
 * long list acceptable, and this is a list that should stay at four.
 */

const ROLE_META: Record<AdminRole, { label: string; bg: string; ink: string; icon: TablerIcon }> = {
  owner: { label: 'owner', bg: 'var(--blue-50)', ink: 'var(--blue-600)', icon: IconCrown },
  platform_admin: {
    label: 'platform_admin',
    bg: 'var(--surface-inset)',
    ink: 'var(--text-secondary)',
    icon: IconShieldLock,
  },
  support: {
    label: 'support',
    bg: 'var(--surface-inset)',
    ink: 'var(--text-tertiary)',
    icon: IconLock,
  },
};

/**
 * The signed-in operator, in the FIXTURE only.
 *
 * The live roster marks itself: `getLiveAdmins` sets `you` from the session,
 * because the reader knows who is asking and this constant cannot.
 */
const CURRENT_ADMIN_ID = 'ad_1';

/**
 * ⚠ THREE STATES, NOT TWO, AND THE THIRD IS THE ONE THAT MATTERS.
 *
 * MFA off is AMBER — a gap to close rather than a breach, since the account is
 * legitimate and the operator can fix it today. Colouring it as danger beside
 * a role chip would read as "this person is compromised".
 *
 * MFA UNKNOWN is neither. Enrolment lives in `auth.users`, behind the admin
 * client that is lint-guarded because it bypasses Row Level Security, so the
 * live reader returns null rather than widening that guard for a status chip.
 * Rendering an unknown as "off" would put an amber warning against a colleague
 * who may well have it switched on — a figure somebody would act on, invented.
 */
const MFA_CHIP: Record<'on' | 'off' | 'unknown', { label: string; ink: string; icon: TablerIcon }> =
  {
    on: { label: 'MFA on', ink: 'var(--success-fg)', icon: IconLock },
    off: { label: 'MFA off', ink: 'var(--warning-fg)', icon: IconAlertTriangle },
    unknown: { label: 'MFA unknown', ink: 'var(--text-tertiary)', icon: IconHelpCircle },
  };

export default async function AdminsPage() {
  /**
   * Live first, designed fixture second — the pattern every other wired
   * surface uses. The fixture stays reachable behind the review bypass, where
   * there is no session for the live reader to resolve.
   */
  const { admins, invitations, capabilities } = (await getLiveAdmins()) ?? (await getAdmins());

  return (
    <ConsolePage>
      {/* Iconography watermarks safely contained */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-[20%] -left-10 hidden -rotate-[15deg] lg:block"
          style={{ color: 'var(--watermark-tint)' }}
        >
          <IconShieldLock size={360} stroke={1} />
        </div>
      </div>

      <div
        className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:gap-6"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="min-w-0 flex-1">
          <ConsoleHeader eyebrow="/platform/admins" title="Admins" />
          <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', maxWidth: '64ch' }}>
            Who can see every workspace on the platform. Keep this list short enough to name from
            memory.
          </p>
        </div>
        <button
          type="button"
          className="t-compact inline-flex h-[34px] shrink-0 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          style={{ background: 'var(--blue-500)', color: '#ffffff', fontWeight: 500 }}
        >
          <IconUserPlus size={15} stroke={1.5} aria-hidden />
          Invite admin
        </button>
      </div>

      {/* ── Roster ───────────────────────────────────────────────────── */}
      <div
        className="mt-5 overflow-hidden rounded-overlay"
        style={{
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-raised)',
          boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
        }}
      >
        {admins.map((a) => {
          const role = ROLE_META[a.role];
          const RoleIcon = role.icon;
          /* The live reader knows who is asking; the fixture cannot, so it
             falls back to the drawn roster's first row. */
          const you = a.you ?? a.id === CURRENT_ADMIN_ID;
          return (
            <div
              key={a.id}
              className="flex flex-wrap items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--surface-sunken)]"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span
                className="grid size-[38px] shrink-0 place-items-center rounded-full"
                style={{
                  background: you ? 'var(--blue-50)' : 'var(--surface-inset)',
                  color: you ? 'var(--blue-500)' : 'var(--text-secondary)',
                  font: '500 13px/1 var(--font-mono)',
                }}
                aria-hidden
              >
                {a.initials}
              </span>

              <span className="min-w-0 flex-[1.4] basis-[180px]">
                <span className="flex items-center gap-2.5">
                  <span
                    className="truncate"
                    style={{
                      font: '400 var(--text-base)/1.35 var(--font-ui)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {a.name}
                  </span>
                  {you ? (
                    <span
                      className="inline-flex h-[19px] shrink-0 items-center rounded-full px-2"
                      style={{
                        background: 'var(--surface-inset)',
                        font: '500 10.5px/1 var(--font-mono)',
                        letterSpacing: '0.06em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      YOU
                    </span>
                  ) : null}
                </span>
                <span
                  className="mt-0.5 block truncate"
                  style={{ font: '400 12px/1.35 var(--font-mono)', color: 'var(--text-tertiary)' }}
                >
                  {a.email}
                </span>
              </span>

              <span className="w-[150px] shrink-0">
                <span
                  className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap"
                  style={{
                    background: role.bg,
                    color: role.ink,
                    font: '500 11.5px/1 var(--font-mono)',
                    letterSpacing: '0.02em',
                  }}
                >
                  <RoleIcon size={13} stroke={1.5} aria-hidden />
                  {role.label}
                </span>
              </span>

              <span className="w-[150px] shrink-0">
                <span className="t-compact block" style={{ color: 'var(--text-secondary)' }}>
                  {a.lastSeen}
                </span>
                <span
                  className="mt-0.5 block"
                  style={{ font: '400 11px/1.35 var(--font-mono)', color: 'var(--text-tertiary)' }}
                >
                  {a.sessions30d === 0
                    ? 'no sessions'
                    : `${a.sessions30d} ${a.sessions30d === 1 ? 'session' : 'sessions'} · 30d`}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2.5">
                {(() => {
                  /* See MFA_CHIP. Three states, and null is not false. */
                  const mfa = MFA_CHIP[a.mfa === null ? 'unknown' : a.mfa ? 'on' : 'off'];
                  const MfaIcon = mfa.icon;
                  return (
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap"
                      style={{ font: '400 11.5px/1 var(--font-mono)', color: mfa.ink }}
                    >
                      <MfaIcon size={13} stroke={1.5} aria-hidden />
                      {mfa.label}
                    </span>
                  );
                })()}
                <button
                  type="button"
                  aria-label={`Manage ${a.name}`}
                  className="grid size-[30px] place-items-center rounded-panel transition-colors hover:bg-[var(--surface-inset)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <IconDotsVertical size={16} stroke={1.5} aria-hidden />
                </button>
              </span>
            </div>
          );
        })}

        <div
          className="flex items-center gap-3 px-5 py-3.5"
          style={{ background: 'var(--surface-sunken)' }}
        >
          <IconShieldCheck
            size={16}
            stroke={1.5}
            className="shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden
          />
          <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
            Platform admins bypass no Row Level Security policy. They gain workspace access only
            through a logged support session.
          </p>
        </div>
      </div>

      {/* ── Invitations + capabilities ───────────────────────────────── */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <Panel title="Pending invitations" flush>
          {/*
            ⚠ EMPTY HERE IS A FACT ABOUT THE SCHEMA, NOT ABOUT TODAY.

            `invitations` is tenant-scoped: every row carries a tenant id and a
            member role, so the table cannot express "invite someone to the
            platform". The drawn version of this panel shows two pending
            invitations that no query can ever return. An empty panel that says
            "none pending" would be a different and untrue claim, so it says
            what is actually so.
          */}
          {invitations.length === 0 ? (
            <p
              className="t-compact px-5 py-4"
              style={{ color: 'var(--text-tertiary)', maxWidth: '52ch' }}
            >
              Platform admin invitations are not yet a record. Invitations are scoped to a
              workspace, so access to the console is granted directly rather than invited.
            </p>
          ) : null}
          {invitations.map((inv) => (
            <div
              key={inv.email}
              className="flex items-center gap-3.5 px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full"
                style={{ border: '1px dashed var(--border-strong)', color: 'var(--text-tertiary)' }}
                aria-hidden
              >
                <IconMail size={15} stroke={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate"
                  style={{
                    font: '400 var(--text-sm)/1.35 var(--font-mono)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {inv.email}
                </span>
                <span className="t-caption mt-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                  Sent {inv.sentAgo} · expires in {inv.expiresIn}
                </span>
              </span>
              <button
                type="button"
                className="t-caption h-7 shrink-0 rounded-panel px-2.5 whitespace-nowrap transition-colors"
                style={{
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-secondary)',
                }}
              >
                Revoke
              </button>
            </div>
          ))}
          {invitations.length > 0 ? (
            <p className="t-compact px-5 py-3.5" style={{ color: 'var(--text-tertiary)' }}>
              Invitations expire after seven days and can only be issued by an existing platform
              admin.
            </p>
          ) : null}
        </Panel>

        <Panel title="Role capabilities" flush>
          <div className="px-5 pt-1.5 pb-4">
            {/* Header row first, so a screen reader meets the column names
                before the values. The design puts it last, which reads fine
                visually and backwards to anything linear. */}
            <div
              className="flex items-center gap-3 pb-2"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span className="flex-1" />
              {['Owner', 'Admin', 'Support'].map((h) => (
                <span
                  key={h}
                  className="grid w-[58px] place-items-center"
                  style={{
                    font: '500 10.5px/1 var(--font-mono)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {capabilities.map((c, i) => {
              /* The last two rows are all-crosses. They get a hairline above
                 them so they read as a separate statement rather than as two
                 more capabilities that happen to be off. */
              const denialBlock = i === capabilities.length - 2;
              return (
                <div
                  key={c.label}
                  className="flex items-center gap-3 py-2.5"
                  style={{
                    borderBottom:
                      i === capabilities.length - 1 ? undefined : '1px solid var(--border-subtle)',
                    borderTop: denialBlock ? '1px solid var(--border-strong)' : undefined,
                    marginTop: denialBlock ? 6 : undefined,
                    paddingTop: denialBlock ? 12 : undefined,
                  }}
                >
                  <span className="t-compact flex-1" style={{ color: 'var(--text-primary)' }}>
                    {c.label}
                  </span>
                  <Cell on={c.owner} label={`Owner: ${c.label}`} />
                  <Cell on={c.admin} label={`Admin: ${c.label}`} />
                  <Cell on={c.support} label={`Support: ${c.label}`} />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </ConsolePage>
  );
}

function Cell({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className="grid w-[58px] place-items-center"
      style={{ color: on ? 'var(--success-fg)' : 'var(--text-disabled)' }}
      role="img"
      aria-label={`${label}: ${on ? 'yes' : 'no'}`}
    >
      {on ? (
        <IconCheck size={15} stroke={1.5} aria-hidden />
      ) : (
        <IconMinus size={15} stroke={1.5} aria-hidden />
      )}
    </span>
  );
}
