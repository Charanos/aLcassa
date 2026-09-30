import { IconCheck, IconDownload, IconKey, IconMinus, IconWebhook } from '@tabler/icons-react';
import { IconTile } from '@/components/primitives/IconTile';
import { DataSource, SettingsSection } from '../Surface';
import type { SettingsModel } from '@/lib/console/data';
import {
  DESIGNED_NOTIFICATIONS,
  ENFORCED_CONTROLS,
  PLANNED_CONTROLS,
  RETENTION,
  type Control,
} from './controls';

/**
 * The four tabs that state rather than edit: Security, Notifications, Data,
 * Developer.
 *
 * ⚠ NOTHING HERE IS A CONTROL, AND NOTHING LOOKS LIKE ONE. Every switch these
 * tabs used to draw either could not move or moved and saved nowhere. A row
 * that states a fact is drawn as a statement; a row describing something not
 * built is drawn in a list that says so. See `controls.ts` for what each
 * claim was checked against.
 */

const DESIGNED_NOTE = 'Designed, not built. Nothing on this tab changes what the platform does.';

/* ── Security ─────────────────────────────────────────────────────────── */

export function SecurityStatements() {
  return (
    <>
      <SettingsSection
        title="Enforced"
        standfirst="These bind every operator, you included. They are code, not configuration: changing one is a release."
        action={
          <DataSource
            kind="live"
            detail="in code"
            explain="Each line names where it is enforced."
          />
        }
        flush
      >
        <ul className="m-0 list-none p-0">
          {ENFORCED_CONTROLS.map((c) => (
            <ControlRow key={c.key} control={c} enforced />
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection
        title="Not built yet"
        standfirst="Designed and not enforced. Listed so their absence is not read as a setting that happens to be off."
        flush
      >
        <ul className="m-0 list-none p-0">
          {PLANNED_CONTROLS.map((c) => (
            <ControlRow key={c.key} control={c} enforced={false} />
          ))}
        </ul>
      </SettingsSection>
    </>
  );
}

function ControlRow({ control: c, enforced }: { control: Control; enforced: boolean }) {
  return (
    <li
      className="flex items-start gap-3.5 px-5 py-4"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <span
        aria-hidden
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"
        style={{
          background: enforced ? 'var(--success-bg)' : 'transparent',
          border: enforced ? 'none' : '1px dashed var(--border-strong)',
          color: enforced ? 'var(--success-fg)' : 'var(--text-disabled)',
        }}
      >
        {enforced ? <IconCheck size={12} stroke={2.25} /> : <IconMinus size={12} stroke={2} />}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="t-compact"
          style={{
            color: enforced ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 500,
          }}
        >
          <span className="sr-only">{enforced ? 'Enforced: ' : 'Not built: '}</span>
          {c.label}
        </p>
        <p
          className="t-caption mt-1"
          style={{ color: 'var(--text-secondary)', textWrap: 'pretty', maxWidth: '68ch' }}
        >
          {c.detail}
        </p>
        {c.where ? (
          <p
            className="mt-1.5 font-mono text-2xs tracking-[0.04em]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {c.where}
          </p>
        ) : null}
      </div>
      {c.value ? (
        <span
          className="inline-flex h-7 shrink-0 items-center rounded-chip px-2.5 whitespace-nowrap"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-sunken)',
            color: 'var(--text-primary)',
            font: '400 var(--type-compact)/1 var(--font-mono)',
          }}
        >
          {c.value}
        </span>
      ) : null}
    </li>
  );
}

/* ── Notifications ────────────────────────────────────────────────────── */

export function NotificationStatements() {
  const cols = 'minmax(0,1fr) 72px 72px';
  return (
    <SettingsSection
      title="Notifications"
      standfirst="Which alerts the design calls for, and on which channel. None is sent today."
      action={<DataSource kind="designed" explain={DESIGNED_NOTE} />}
      flush
    >
      <div role="table" aria-label="Designed notifications">
        <div
          role="row"
          className="grid items-center px-5 py-2.5"
          style={{
            gridTemplateColumns: cols,
            background: 'var(--surface-sunken)',
          }}
        >
          {/* A real cell holding hidden text: an `sr-only` cell leaves the
              grid and pulls every header one column left. */}
          <span role="columnheader">
            <span className="sr-only">Event</span>
          </span>
          {['Console', 'Email'].map((h) => (
            <span
              key={h}
              role="columnheader"
              className="text-center font-mono text-2xs tracking-[0.12em] uppercase"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {h}
            </span>
          ))}
        </div>
        {DESIGNED_NOTIFICATIONS.map((n) => (
          <div
            key={n.key}
            role="row"
            className="grid items-center px-5 py-3.5"
            style={{ gridTemplateColumns: cols, borderTop: '1px solid var(--border-subtle)' }}
          >
            <span role="rowheader" className="min-w-0 pr-4">
              <span className="t-compact block" style={{ color: 'var(--text-primary)' }}>
                {n.label}
              </span>
              <span
                className="t-caption mt-0.5 block"
                style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
              >
                {n.detail}
              </span>
            </span>
            <Mark on={n.console} />
            <Mark on={n.email} />
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

function Mark({ on }: { on: boolean }) {
  return (
    <span role="cell" className="grid place-items-center">
      <span
        className="grid size-6 place-items-center rounded-full"
        style={{ color: on ? 'var(--text-secondary)' : 'var(--text-disabled)' }}
      >
        {on ? (
          <IconCheck size={14} stroke={2} aria-label="Designed on" />
        ) : (
          <IconMinus size={14} stroke={2} aria-label="Designed off" />
        )}
      </span>
    </span>
  );
}

/* ── Data ─────────────────────────────────────────────────────────────── */

export function DataStatements({ exports }: { exports: SettingsModel['exports'] }) {
  return (
    <>
      <SettingsSection
        title="What the platform keeps"
        standfirst="Nothing is deleted on a schedule. No retention job runs, so nothing below has an expiry."
        flush
      >
        <ul className="m-0 list-none p-0">
          {RETENTION.map((r) => (
            <li
              key={r.label}
              className="flex items-start gap-4 px-5 py-4"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <span className="min-w-0 flex-1">
                <span
                  className="t-compact block"
                  style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                >
                  {r.label}
                </span>
                <span
                  className="t-caption mt-1 block"
                  style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
                >
                  {r.detail}
                </span>
              </span>
              <span
                className="inline-flex h-7 shrink-0 items-center rounded-chip px-2.5"
                style={{
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-primary)',
                  font: '400 var(--type-compact)/1 var(--font-mono)',
                }}
              >
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection
        title="Export"
        standfirst="Platform records only. Customer message bodies are never exportable from this console."
        action={<DataSource kind="live" detail="generated on request" />}
      >
        <div className="flex flex-wrap gap-2.5">
          {/* Links rather than buttons: the route answers with
              Content-Disposition and the browser does the rest. Same handler
              as the Export control on Workspaces, Revenue and the audit log —
              one route, one closed catalogue. 17 §6.1. */}
          {exports.map((x) => (
            <a
              key={x.resource}
              href={`/api/platform/export/${x.resource}`}
              className="t-compact inline-flex h-9 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            >
              <IconDownload size={15} stroke={1.5} aria-hidden />
              {x.label}
            </a>
          ))}
        </div>
        <p className="t-caption mt-3.5" style={{ color: 'var(--text-tertiary)' }}>
          Each export is itself recorded in the platform audit log.
        </p>
      </SettingsSection>
    </>
  );
}

/* ── Developer ────────────────────────────────────────────────────────── */

/**
 * ⚠ THIS TAB LISTED THREE `pk_live_` KEYS AND TWO WEBHOOKS, ONE OF THEM
 * FAILING. None existed: platform-level keys are not a table, and no webhook
 * sender is built. A client reading it would have asked which of our systems
 * was failing to deliver billing events. It states what is true instead.
 */
export function DeveloperStatements() {
  return (
    <SettingsSection title="Developer access" flush>
      <ul className="m-0 list-none p-0">
        <DeveloperRow
          icon={IconKey}
          title="API keys belong to workspaces"
          source={
            <DataSource
              kind="live"
              detail="by design"
              explain="There is no platform-level key table."
            />
          }
        >
          The platform has no keys of its own. A workspace issues its keys, sees each value once,
          and revokes them from its own dashboard, where the change is recorded against the customer
          who owns it. The console stores a hash and cannot recover a value.
        </DeveloperRow>
        <DeveloperRow
          icon={IconWebhook}
          title="Webhooks"
          source={<DataSource kind="designed" explain={DESIGNED_NOTE} />}
        >
          Not built. No platform event leaves the console today; there is nothing to subscribe to
          and nothing to deliver.
        </DeveloperRow>
      </ul>
    </SettingsSection>
  );
}

function DeveloperRow({
  icon,
  title,
  source,
  children,
}: {
  icon: typeof IconKey;
  title: string;
  source: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li
      className="flex items-start gap-3.5 px-5 py-4"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <IconTile icon={icon} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="t-compact" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {title}
          </p>
          {source}
        </div>
        <p
          className="t-caption mt-1"
          style={{ color: 'var(--text-secondary)', textWrap: 'pretty', maxWidth: '68ch' }}
        >
          {children}
        </p>
      </div>
    </li>
  );
}
