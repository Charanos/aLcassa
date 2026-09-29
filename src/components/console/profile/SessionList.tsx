import { IconDeviceDesktop, IconLifebuoy, IconShieldCheck } from '@tabler/icons-react';
import type { DeviceSession } from '@/lib/console/data';
import { PagedList } from '@/components/primitives/Pagination';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { SectionHeading } from '@/components/console/Surface';
import { IconTile } from '@/components/primitives/IconTile';
import { RecordRow } from '@/components/console/profile/shared';
import { EndSessionButton, RevokeOthersButton } from '@/components/console/profile/SessionActions';

/**
 * Devices signed into this account.
 *
 * ⚠ THIS IS THE ONLY PART OF THE PROFILE THAT CAN ACT, and the question it
 * answers is "is something else signed in as me". Everything about how it is
 * built follows from that one reading task:
 *
 *   · the current device sorts first, because the reader's first job is ruling
 *     themselves out before they can be alarmed by anything else;
 *   · expired sessions are excluded by the reader (they used to be listed, so
 *     last Tuesday's laptop could be mistaken for an intruder);
 *   · the resting state SAYS nothing else is signed in rather than showing a
 *     one-row list and leaving the reader to work it out;
 *   · nothing is silently dropped — a capped query reports what it withheld.
 *
 * ⚠ PAGED AT EIGHT, AND THE REVERSAL POINT IS STATED. `PagedList` windows
 * already-rendered server children, so paging costs no round trip and no row
 * becomes a client component. It ships every page's markup, which is the right
 * trade for a list bounded by how many devices one person signs in from. If
 * this ever needs to page a log-shaped list, the right component is a cursor
 * against the query instead.
 */
const PAGE_SIZE = 8;

export function SessionList({
  sessions,
  hidden,
  live,
}: {
  sessions: DeviceSession[];
  /** Live sessions the capped query did not return. Zero on any real account. */
  hidden: number;
  /** False on the preview path: revocation is refused before it is offered. */
  live: boolean;
}) {
  const others = sessions.filter((s) => !s.current).length;

  return (
    <section className="flex flex-col">
      <SectionHeading
        title="Active sessions"
        note="Devices currently signed into this account. Ending one takes effect on its next request, not whenever a token expires."
        action={<RevokeOthersButton others={others} live={live} />}
      />
      <div className="mt-4">
        {sessions.length === 0 ? (
          /* Unreachable while signed in — reading this page requires a session,
             so the list contains at least the reader's own. Drawn anyway, because
             the alternative to a designed impossible state is an undesigned one,
             and "the panel rendered blank" is indistinguishable from a failure to
             load. */
          <div className="px-5 py-10 text-center">
            <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
              No sessions could be read for this account.
            </p>
          </div>
        ) : (
          <div className="pb-2">
            <PagedList pageSize={PAGE_SIZE} noun="sessions" label="Session pages">
              {sessions.map((s) => (
                <SessionRow key={s.id} session={s} live={live} />
              ))}
            </PagedList>

            {others === 0 ? <NothingElseSignedIn /> : null}
          </div>
        )}
      </div>

      {hidden > 0 ? (
        <div className="mt-4 px-1">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--warning-fg)' }}>
            {hidden} more live {hidden === 1 ? 'session is' : 'sessions are'} not shown &mdash; this
            screen reads a capped number of rows. Signing out other devices still ends all of them.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * One device. A server component — only its button is client code.
 */
function SessionRow({ session, live }: { session: DeviceSession; live: boolean }) {
  const { current, support } = session;

  return (
    <div
      className="mb-4 overflow-hidden rounded-overlay border transition-shadow duration-300 hover:shadow-[var(--shadow-md)]"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--surface-raised)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <RecordRow
        glyph={
          /*
            ⚠ A TILE HERE, A CIRCLE IN THE SECURITY LIST, AND THE DIFFERENCE IS
            THE RULE `IconTile` STATES.

            A device is an OBJECT — a laptop, a phone, a support visit — so it
            gets the app-icon treatment: a rounded square that reads as a thing.
            A security item's glyph is a STATE, green for enrolled, so it keeps
            `RowGlyph`'s tinted circle. Using the same shape for both would make
            "this is your MacBook" and "this is satisfactory" look like the same
            kind of claim.

            The tone is still doing work: the current device washes success, a
            support session washes info because it is a different KIND of thing
            rather than a better one, and an ordinary other device stays neutral.
          */
          <IconTile
            icon={support ? IconLifebuoy : current ? IconShieldCheck : IconDeviceDesktop}
            tone={current ? 'success' : support ? 'info' : 'neutral'}
            size="lg"
          />
        }
        label={
          <span
            className="flex flex-wrap items-center gap-2 text-base"
            style={{ color: 'var(--text-primary)', fontWeight: 500 }}
          >
            {session.device}
            {support ? (
              <StatusBadge tone="info" size="sm">
                support session
              </StatusBadge>
            ) : null}
          </span>
        }
        detail={
          <span style={{ font: '400 12px/1.5 var(--font-mono)', color: 'var(--text-tertiary)' }}>
            {session.meta}
          </span>
        }
        meta={
          <span
            className="whitespace-nowrap"
            style={{
              font: '400 12.5px/1.5 var(--font-ui)',
              color: current ? 'var(--success-fg)' : 'var(--text-secondary)',
            }}
          >
            {session.when}
          </span>
        }
        control={
          current ? (
            /* ⚠ NOT A DISABLED BUTTON. There is no action here to disable —
               the current device is ended by signing out, which is a different
               control with a different outcome. A greyed-out "End session" in
               this slot would be a control that looks like it should work. */
            <StatusBadge tone="neutral" size="sm">
              This device
            </StatusBadge>
          ) : (
            <EndSessionButton
              sessionId={session.id}
              device={session.device}
              when={session.when}
              support={support}
              live={live}
            />
          )
        }
      />
    </div>
  );
}

/**
 * The resting state, and it is the GOOD one.
 *
 * ⚠ IT IS A NOTE, NOT AN `EmptyState`. The list is not empty — the reader's own
 * session is in it — so the centred icon-and-title treatment would be claiming
 * there is nothing here while a row sits directly above it. What is empty is
 * the set of things worth worrying about, and that deserves one quiet sentence
 * rather than a panel-sized announcement.
 *
 * Same reasoning as the overview queue's resting note: a security screen with
 * nothing to report should say so in words, because an operator who sees only
 * their own device still has to reason their way to "then nothing else is
 * signed in", and that is a conclusion the screen can hand them instead.
 */
function NothingElseSignedIn() {
  return (
    <p
      className="t-caption px-5 py-4 text-center"
      style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
    >
      Nothing else is signed in. This is the only live session on your account.
    </p>
  );
}
