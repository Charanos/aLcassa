import { IconShieldCheck, IconShieldExclamation } from '@tabler/icons-react';
import { IconTile } from '@/components/primitives/IconTile';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';
import { DataSource, Panel, SectionHeading } from '../Surface';
import type { IsolationStatus } from '@/lib/console/data';
import { Figure } from '@/components/primitives/Figure';

/**
 * ISOLATION. Sheet 11: "the severe risk in the brief is a policy gap; its
 * status belongs beside uptime, not buried in CI."
 *
 * ⚠ TWO DIFFERENT FACTS USED TO SHARE ONE PANEL AND ONE LABEL.
 *
 * The page read the policy catalogue when it loaded — a live check of whether
 * every tenant table has row-level security on — and labelled the time of that
 * read "Last run", beside a paragraph describing the isolation SUITE. A reader
 * reasonably concluded the suite had run at that moment. It had not: the suite
 * runs in CI on every push; the page runs a catalogue query. Both are real,
 * both matter, and they prove different things — the catalogue proves the
 * policies EXIST, the suite proves they WORK. They are two panels now.
 *
 * ⚠ AND ONE OF ITS FIGURES WAS A CONFIDENT ZERO. "Refused 0 / 0", in the
 * success colour, reads as "every cross-tenant attempt was refused". It meant
 * "nothing counts attempts". Those figures are `null` in the data now, and
 * render as what they are.
 */
export function IsolationBand({
  isolation,
  live,
}: {
  isolation: IsolationStatus;
  /** False under the review bypass, where there is no session to read with. */
  live: boolean;
}) {
  const gap = isolation.tablesTotal - isolation.tablesPoliced;
  const holding = gap === 0 && isolation.tablesTotal > 0;
  const counted =
    isolation.crossTenantAttempts30d !== null && isolation.crossTenantRefused30d !== null;

  return (
    <section id="isolation" aria-labelledby="health-isolation" className="scroll-mt-24">
      <SectionHeading
        id="health-isolation"
        title="Isolation"
        note="Workspace table policies checked against the current database configuration."
        align="right"
        action={
          live ? (
            <DataSource kind="live" detail={`checked ${isolation.lastRun} EAT`} />
          ) : (
            <DataSource kind="designed" detail="sign in to read it live" />
          )
        }
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* ── The catalogue: do the policies exist? ─────────────────────── */}
        <Panel title="Policy check" variant="elevated">
          <div className="flex items-start gap-4">
            <IconTile
              icon={holding ? IconShieldCheck : IconShieldExclamation}
              size="md"
              tone={holding ? 'success' : 'danger'}
            />
            <div className="min-w-0">
              <p className="flex items-baseline gap-2 tabular-nums">
                <span
                  style={{
                    font: '500 var(--type-hero)/1 var(--font-mono)',
                    letterSpacing: '-0.03em',
                    color: holding ? 'var(--text-primary)' : 'var(--danger-fg)',
                  }}
                >
                  {isolation.tablesPoliced}
                </span>
                <span
                  style={{
                    font: '400 var(--type-lede)/1 var(--font-mono)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  of {isolation.tablesTotal} tables covered
                </span>
              </p>
              <p
                className="t-body mt-3"
                style={{
                  color: holding ? 'var(--text-secondary)' : 'var(--danger-fg)',
                  textWrap: 'pretty',
                }}
              >
                {holding
                  ? 'Every workspace table has row security enabled and enforced, with at least one policy.'
                  : `${gap} workspace ${gap === 1 ? 'table needs' : 'tables need'} a policy-configuration review.`}
              </p>
            </div>
          </div>

          <p
            className="t-caption mt-5 rounded-overlay px-4 py-3"
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--text-secondary)',
              textWrap: 'pretty',
            }}
          >
            Coverage checks configuration when this page loads. Separate access tests are needed to
            verify what each policy permits.
          </p>

          <div className="mt-5 grid">
            <Figure
              label="Checked"
              value={live ? `${isolation.lastRun} · EAT` : 'Designed figure'}
            />
            <Figure
              label="Cross-tenant attempts · 30 days"
              value={counted ? String(isolation.crossTenantAttempts30d) : 'Not yet counted'}
              tone={counted ? 'default' : 'muted'}
            />
            <Figure
              label="Refused"
              value={
                counted
                  ? `${isolation.crossTenantRefused30d} of ${isolation.crossTenantAttempts30d}`
                  : 'Not yet counted'
              }
              tone={counted ? 'default' : 'muted'}
            />
          </div>

          {!counted ? (
            <p
              className="t-caption mt-3"
              style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
            >
              Cross-workspace access attempts are not currently measured by this console.
            </p>
          ) : null}
        </Panel>

        {/* ── The suite: do the policies work? ──────────────────────────── */}
        <Panel
          title="Access checks in the test suite"
          variant="elevated"
          footer={
            <p className="t-caption" style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}>
              These checks describe the verification suite. This page does not report the result of
              a particular test run; review the release evidence for that result.
            </p>
          }
        >
          {/*
            ⚠ NUMBERED BECAUSE THE SUITE NUMBERS THEM. These are the ten cases
            `tests/isolation/generated.test.ts` writes for each table, in its
            order and under its numbers, so a failure reported in CI as "case 6"
            can be found here by the same number. Kept in step by hand — the
            test file is not in the bundle — and short enough to check.
          */}
          <ol className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-2">
            {SUITE_CASES.map((c, i) => (
              <li
                key={c}
                className="flex gap-3.5 border-b py-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span
                  className="shrink-0 tabular-nums"
                  style={{
                    font: '500 var(--type-chip)/1.6 var(--font-mono)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="t-compact" style={{ color: 'var(--text-primary)' }}>
                  {c}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </section>
  );
}

const SUITE_CASES = [
  "Reads return only the tenant's own rows",
  "Another tenant's row, by key, returns nothing — not an error",
  "Updating another tenant's row changes nothing",
  "Deleting another tenant's row removes nothing",
  'Inserting a row for another tenant is rejected',
  'Moving a row into another tenant is rejected',
  'An agent cannot write an owner-and-admin table',
  'With no tenant context, reads are empty and writes fail',
  'A support session writes only where it was opened to',
  "A join into another tenant's parent row returns nothing",
] as const;

export function IsolationBandSkeleton() {
  return (
    <SkeletonGroup label="Loading isolation" className="block">
      <SkeletonSectionHeading align="right" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Panel title="Policy check" variant="elevated">
          <div className="flex items-start gap-4">
            <SkeletonBar width={36} height={36} radius="rounded-overlay" />
            <div className="flex-1">
              <SkeletonBar width={220} height={42} />
              <SkeletonBar width="80%" height={14} className="mt-3" />
            </div>
          </div>
          <SkeletonBar width="100%" height={64} radius="rounded-overlay" className="mt-5" />
          <div className="mt-5 grid gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex justify-between">
                <SkeletonBar width={`${46 - i * 6}%`} height={13} />
                <SkeletonBar width={112} height={13} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="What the suite proves, per table" variant="elevated">
          <div className="grid gap-x-8 md:grid-cols-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-3.5 py-3.5">
                <SkeletonBar width={16} height={11} />
                <SkeletonBar width={`${88 - (i % 4) * 11}%`} height={13} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </SkeletonGroup>
  );
}
