import type { Metadata } from 'next';
import { IconClock, IconDoorEnter, IconHandStop, IconUsers } from '@tabler/icons-react';
import {
  ConsoleHeader,
  ConsolePage,
  DataSource,
  SectionHeading,
} from '@/components/console/Surface';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { OpenSessionsBand } from '@/components/console/support/OpenSessionsBand';
import { VisitsLedger } from '@/components/console/support/VisitsLedger';
import { ShapeBand } from '@/components/console/support/ShapeBand';
import { GuaranteesPanel } from '@/components/console/support/GuaranteesPanel';
import { OpenSessionControl } from '@/components/console/support/OpenSessionControl';
import { minutesLabel } from '@/components/console/support/outcomes';
import {
  getSupportRegister,
  type RegisterFilters,
  type VisitOutcome,
} from '@/lib/console/liveSupport';
import { fetchBreakGlassState } from '../actions';

export const metadata: Metadata = { title: 'Support sessions' };

const OUTCOMES: VisitOutcome[] = [
  'open',
  'operator',
  'colleague',
  'customer',
  'expired',
  'superseded',
  'break_glass',
];

/**
 * The support register. Doc 24.
 *
 * The question it answers: who is inside which customer right now, why, and
 * what did each visit cost the customer?
 *
 * ⚠ IT READ NOTHING AND SAID SO CONFIDENTLY. "0 open · 0 recorded · 0 ended by
 * the customer" over an empty table, because the reader had no actor and the
 * policies returned nothing. It said sessions were "read-only" with "no
 * extension" (both false), "last 30 days" over a query with no date bound, and
 * showed only the reader's own open session. Every figure below is read as the
 * operator, the record is closed up to date before it is read, and every
 * sentence about what a visit allows was checked against the code.
 *
 * ⚠ AN ACCOUNTABILITY LEDGER, NOT A PRODUCTIVITY REPORT. The accent goes to
 * the customer ending a visit — the one ending that tells us something.
 */
export default async function SupportSessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters: RegisterFilters = {
    operator: params.operator || undefined,
    workspace: params.workspace || undefined,
    outcome: OUTCOMES.includes(params.outcome as VisitOutcome)
      ? (params.outcome as VisitOutcome)
      : undefined,
    page: Number.parseInt(params.page ?? '1', 10) || 1,
  };

  const [register, glass] = await Promise.all([
    getSupportRegister(filters),
    fetchBreakGlassState().catch(() => null),
  ]);

  const header = (
    <ConsoleHeader
      breadcrumbs={[
        { label: 'Platform Console', href: '/platform' },
        { label: 'Support sessions' },
      ]}
      eyebrow="/platform/support-sessions"
      title="Support sessions"
      actions={
        register ? (
          <OpenSessionControl
            directory={register.directory}
            disabled={glass?.locked ?? false}
            disabledReason={
              glass?.locked
                ? `Support access is locked platform-wide${glass.by ? ` by ${glass.by}` : ''}. Release it in Settings.`
                : undefined
            }
          />
        ) : null
      }
    />
  );

  if (!register) {
    return (
      <ConsolePage>
        {header}
        <p className="t-body mt-6" style={{ color: 'var(--text-secondary)' }}>
          Sign in as a platform operator to read the register. It lists every visit the platform
          made into a customer&rsquo;s workspace, and there is no designed version of it.
        </p>
      </ConsolePage>
    );
  }

  const f = register.facts;
  const openNames = register.open
    .map((v) => `${v.mine ? 'You' : v.operatorName} in ${v.tenantName}`)
    .join(' · ');

  return (
    <ConsolePage>
      {header}

      <FactStrip label="Support access at a glance">
        <FactCell
          icon={IconDoorEnter}
          tone={f.openNow > 0 ? 'brand' : 'neutral'}
          label="Open now"
          value={
            f.openNow === 0
              ? 'Nobody inside'
              : `${f.openNow} ${f.openNow === 1 ? 'visit' : 'visits'}`
          }
          note={f.openNow === 0 ? 'No operator is inside a customer’s workspace.' : openNames}
          source={<DataSource kind="live" />}
        />
        <FactCell
          icon={IconUsers}
          label="Visits · 30 days"
          value={f.visits === 0 ? 'None' : String(f.visits)}
          note={
            f.visits === 0
              ? register.everUsed
                ? 'Older visits are kept; the register shows thirty days.'
                : 'Support access has never been used.'
              : `${register.operators.length} ${register.operators.length === 1 ? 'operator' : 'operators'} · ${register.workspaces.length} ${register.workspaces.length === 1 ? 'workspace' : 'workspaces'}`
          }
        />
        <FactCell
          icon={IconClock}
          label="Median visit"
          value={f.medianMinutes === null ? '—' : minutesLabel(f.medianMinutes)}
          note={
            f.medianMinutes === null
              ? 'No visit has ended in the window.'
              : f.extended > 0
                ? `Against a 30-minute cap. ${f.extended} ${f.extended === 1 ? 'was' : 'were'} extended.`
                : 'Against a 30-minute cap. None was extended.'
          }
        />
        <FactCell
          icon={IconHandStop}
          tone={f.endedByCustomer > 0 ? 'warning' : 'neutral'}
          label="Ended by the customer"
          value={f.endedByCustomer === 0 ? 'None' : String(f.endedByCustomer)}
          note={
            f.endedByCustomer === 0
              ? 'No customer has stopped a visit in the window.'
              : 'Worth reading each one. The ceiling working, not a fault.'
          }
        />
      </FactStrip>

      {register.open.length > 0 ? (
        <section aria-labelledby="support-open">
          <SectionHeading
            id="support-open"
            title="Inside now"
            note="Every open visit, with the reason the customer is reading."
            action={<DataSource kind="live" detail="counting down" />}
          />
          <OpenSessionsBand open={register.open} />
        </section>
      ) : null}

      <section aria-labelledby="support-visits">
        <SectionHeading
          id="support-visits"
          title="Visits"
          align={register.open.length > 0 ? 'left' : 'right'}
          note="The last thirty days, newest first. A visit opens what it did."
          action={<DataSource kind="live" />}
        />
        <VisitsLedger register={register} />
      </section>

      <section aria-labelledby="support-shape">
        <SectionHeading
          id="support-shape"
          title="Visit patterns"
          note="How long visits last, and how they end."
          align={register.open.length > 0 ? 'right' : 'left'}
        />
        <ShapeBand register={register} />
      </section>

      <section aria-labelledby="support-guarantees" className="pb-4">
        <SectionHeading
          id="support-guarantees"
          title="Support safeguards"
          note="How access to a customer workspace is controlled."
          align={register.open.length > 0 ? 'left' : 'right'}
        />
        <GuaranteesPanel />
      </section>
    </ConsolePage>
  );
}
