import type { Metadata } from 'next';
import { ConsoleHeader, ConsolePage, Panel } from '@/components/console/Surface';
import { RulesEditor } from '@/components/console/RulesEditor';
import { getMasterRules } from '@/lib/console/data';
import { IconCpu, IconLock } from '@tabler/icons-react';

export const metadata: Metadata = { title: 'Master AI rules' };

/**
 * Master AI rules. `AI-Rules.dc.html`.
 *
 * ⚠ THE LEDE STATES THE INHERITANCE MODEL IN ONE SENTENCE: "the floor every
 * workspace inherits. Workspaces may add rules on top; they cannot remove
 * these."
 *
 * That is the entire product decision this screen implements, and the three
 * groups descend through it — enforced, floor, default. It is also the answer
 * to the question a customer asks when they discover master rules exist at
 * all: what can the platform make my assistant do? The page answers it in the
 * open rather than burying it in a policy document.
 *
 * The inheritance panel completes the loop by naming what happens at the other
 * end: a workspace rule that contradicts a master rule is rejected at save
 * time, in THEIR console, naming the master rule that blocked it. A silent
 * override would be the same feature with none of the trust.
 */
export default async function AiRulesPage() {
  const model = await getMasterRules();

  return (
    <ConsolePage>
      {/* Iconography watermarks safely contained */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[25%] -right-10 hidden rotate-[20deg] lg:block" style={{ color: 'var(--watermark-tint)' }}>
          <IconCpu size={380} stroke={1} />
        </div>
      </div>

      <div
        className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:gap-6"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="min-w-0 flex-1">
          <ConsoleHeader eyebrow="/platform/ai-rules" title="Master AI rules" />

          {/*
            ⚠ THE SINGLETON SAYS SO. Sheet 10: "A lock chip beside the title
            states that this record cannot be duplicated. The constraint lives
            in the database; the chip is how a reader knows without reading the
            schema."

            There is exactly one master rule set, enforced by a one-row
            constraint. Without this an operator has no way to tell whether
            they are editing "the" rules or "a" set of rules — and the
            difference decides whether they expect a New button to exist.
          */}
          <span
            className="mt-3 inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-sunken)',
              color: 'var(--text-secondary)',
              font: '400 11.5px/1 var(--font-mono)',
            }}
          >
            <IconLock size={12} stroke={1.5} aria-hidden />
            Singleton · one record, platform-wide
          </span>

          <p
            className="t-body mt-2.5"
            style={{ color: 'var(--text-secondary)', maxWidth: '70ch' }}
          >
            The floor every workspace inherits. Workspaces may add rules on top; they cannot remove
            these.
          </p>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <RulesEditor model={model} />
        </div>

        <div className="grid gap-4">
          <Panel title="Version history" flush>
            <div className="px-5 pt-1 pb-3.5">
              {model.versions.map((v, i) => (
                <div
                  key={v.label}
                  className="flex gap-3 py-2.5"
                  style={{
                    borderBottom:
                      i === model.versions.length - 1
                        ? undefined
                        : '1px solid var(--border-subtle)',
                  }}
                >
                  {/* A 2px rail rather than a dot: the current version is a
                      position in a sequence, and a rail reads as one. */}
                  <span
                    aria-hidden
                    className="block w-0.5 shrink-0 rounded-full"
                    style={{
                      background: v.current ? 'var(--blue-500)' : 'var(--border-subtle)',
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block"
                      style={{
                        font: '400 var(--text-sm)/1.35 var(--font-ui)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {v.label}
                    </span>
                    <span
                      className="mt-0.5 block"
                      style={{
                        font: '400 11px/1.35 var(--font-mono)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {v.meta}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <section
            className="rounded-overlay p-5"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-sunken)',
            }}
          >
            <p className="t-eyebrow mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Inheritance
            </p>
            <p className="t-compact" style={{ color: 'var(--text-secondary)' }}>
              A workspace rule that contradicts a master rule is rejected at save time, in their
              console, naming the master rule that blocked it.
            </p>
            <div
              className="mt-3.5 grid gap-2.5 border-t pt-3.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                  Workspace overrides
                </span>
                <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                  {model.overrides} active
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                  Conflicts blocked
                </span>
                <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                  {model.conflictsBlocked} this month
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ConsolePage>
  );
}
