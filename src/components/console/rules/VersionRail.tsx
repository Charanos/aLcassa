import { Panel } from '../Surface';
import { RestoreVersion } from './RestoreVersion';
import type { MasterRuleVersion } from '@/lib/console/data';

/**
 * THE VERSION RAIL. 17 §7.
 *
 * ⚠ THE HISTORY IS THE FEATURE, NOT A CHANGELOG.
 *
 * Version rows are append-only and publishing moves a pointer, so a rollback
 * is a pointer move rather than a data restore and every historical set stays
 * readable. A screen that can change a floor every workspace inherits, and
 * cannot show what the floor used to be, is missing the half that makes the
 * change safe.
 *
 * ⚠ THE CURRENT VERSION IS NOT NECESSARILY THE NEWEST ROW, and the rail has to
 * survive that. A draft sitting above the published set is the normal state
 * part-way through an edit; marking the top row as live would be wrong exactly
 * when somebody is about to rely on it. The reader marks `current` from the
 * pointer, and this renders what it is told.
 *
 * A 2px rail rather than a dot: a version is a position in a sequence, and a
 * rail reads as one.
 */
export function VersionRail({
  versions,
  workspaceCount,
}: {
  versions: MasterRuleVersion[];
  workspaceCount: number;
}) {
  const live = versions.find((v) => v.current);
  return (
    <Panel
      title="Version history"
      action={
        <span
          className="whitespace-nowrap"
          style={{ font: '400 var(--type-chip)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
        >
          append-only
        </span>
      }
      flush
    >
      <div className="px-5 pt-1 pb-3.5">
        {versions.map((v, i) => (
          <div
            key={v.id}
            className="flex gap-3 py-2.5"
            style={{
              borderBottom:
                i === versions.length - 1 ? undefined : '1px solid var(--border-subtle)',
            }}
          >
            <span
              aria-hidden
              className="block w-0.5 shrink-0 rounded-full"
              style={{ background: v.current ? 'var(--blue-500)' : 'var(--border-subtle)' }}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span
                  className="numeric"
                  style={{ fontSize: 'var(--type-compact)', color: 'var(--text-primary)' }}
                >
                  v{v.versionNumber}
                </span>
                {v.current ? (
                  <span
                    className="inline-flex h-[18px] shrink-0 items-center rounded-full px-1.5"
                    style={{
                      background: 'var(--blue-50)',
                      color: 'var(--blue-600)',
                      font: '500 var(--type-micro)/1 var(--font-mono)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    live
                  </span>
                ) : null}
              </span>
              <span
                className="mt-0.5 block"
                style={{
                  font: '400 var(--type-chip)/1.35 var(--font-mono)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {v.status} · {v.savedAt}
              </span>
            </span>
            {/*
              ⚠ ONLY ON A PUBLISHED VERSION THAT IS NOT ALREADY LIVE.

              Restoring the live version is a no-op dressed as an action, and
              pointing the platform at a DRAFT would publish something nobody
              chose to publish through a control labelled "restore" — the
              service refuses that too, but an affordance that exists only to
              be refused is not an affordance.
            */}
            {!v.current && v.status === 'published' && live ? (
              <RestoreVersion
                versionId={v.id}
                versionNumber={v.versionNumber}
                currentVersionNumber={live.versionNumber}
                workspaceCount={workspaceCount}
              />
            ) : null}
          </div>
        ))}
      </div>

      <p
        className="t-caption px-5 pb-4"
        style={{ color: 'var(--text-tertiary)', maxWidth: '40ch' }}
      >
        {/*
          ⚠ NO DIFF YET, AND SAYING SO IS BETTER THAN A DISABLED "Compare".
          17 §7 asked for one. It needs two versions' documents in the reader
          rather than one, which is a second query and a second shape — real
          work rather than a control to switch on.
        */}
        Nothing is ever overwritten, so restoring an earlier version is a pointer move and is itself
        reversible. Comparing two versions side by side is not built; the reader fetches only the
        published set today.
      </p>
    </Panel>
  );
}
