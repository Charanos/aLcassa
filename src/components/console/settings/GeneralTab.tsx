'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowRight,
  IconDeviceFloppy,
  IconHistory,
  IconMailForward,
  IconNotebook,
} from '@tabler/icons-react';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
import { useToast } from '@/components/primitives/Toast';
import { savePlatformSettings } from '@/app/(platform)/platform/(console)/settings-actions';
import type { LiveSettings } from '@/lib/console/liveSettings';
import type { SettingsModel } from '@/lib/console/data';
import { DataSource, SettingsSection } from '../Surface';
import { UnsavedBar } from '../UnsavedBar';

/**
 * General — the one tab with anything to save. Doc 23 · S0.2.
 *
 * ⚠ SAVE OPENS A CONFIRMATION THAT LISTS EACH CHANGE, BEFORE → AFTER. The
 * page's warning is that a typo here is not local; the confirmation is where
 * that becomes useful, because it is the last place the typo can be seen as a
 * typo. It names what writes the record and — just as plainly — what does NOT
 * yet read these values, so nobody saves a support address believing
 * customers will see it tomorrow.
 *
 * ⚠ IN THE DESIGNED VIEW THE FIELDS ARE READ-ONLY. With no operator session
 * there is nobody to attribute a change to, and an editable field whose Save
 * is disabled is the "type into nothing" the old footer apologised for.
 */

type Values = { platformName: string; supportEmail: string };
type FieldKey = keyof Values;

const LABEL: Record<FieldKey, string> = {
  platformName: 'Platform name',
  supportEmail: 'Support address',
};

/** As the server will store it: trimmed, and an address lower-cased. A value
 *  that only differs in case or spacing is not a change. */
function normal(key: FieldKey, value: string): string {
  const v = value.trim();
  return key === 'supportEmail' ? v.toLowerCase() : v;
}

/** Mirrors `platformSettingsSchema`. The server is the authority; this only
 *  keeps the Save button honest about whether pressing it can succeed. */
function problemWith(v: Values): Partial<Record<FieldKey, string>> {
  const out: Partial<Record<FieldKey, string>> = {};
  const name = v.platformName.trim();
  if (name.length < 2) out.platformName = 'At least two characters.';
  else if (name.length > 40) out.platformName = 'Under forty characters — it sits in page titles.';
  const email = v.supportEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.supportEmail = 'Not an email address.';
  else if (email.length > 254) out.supportEmail = 'Longer than an email address can be.';
  return out;
}

export function GeneralTab({
  store,
  fixture,
  mailFrom,
  onDirtyChange,
}: {
  /** Null in the designed view. */
  store: LiveSettings | null;
  fixture: SettingsModel;
  /** `EMAIL_FROM`, read on the server. Null when unset. */
  mailFrom: string | null;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const pushToast = useToast();
  const live = store !== null;

  const saved: Values = {
    platformName: store?.platformName ?? fixture.platformName,
    supportEmail: store?.supportEmail ?? fixture.supportEmail,
  };
  const [values, setValues] = useState<Values>(saved);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();

  const changed = (Object.keys(LABEL) as FieldKey[]).filter(
    (k) => normal(k, values[k]) !== saved[k],
  );
  const problems = problemWith(values);
  const valid = Object.keys(problems).length === 0;
  const dirty = changed.length > 0;

  function set(key: FieldKey, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    onDirtyChange((Object.keys(LABEL) as FieldKey[]).some((k) => normal(k, next[k]) !== saved[k]));
  }

  function discard() {
    setValues(saved);
    onDirtyChange(false);
  }

  function save() {
    if (!store) return;
    setError(null);
    startTransition(async () => {
      const result = await savePlatformSettings({
        platformName: values.platformName,
        supportEmail: values.supportEmail,
        expectedUpdatedAt: store.updatedAt,
      });
      if (result.ok) {
        setConfirmOpen(false);
        onDirtyChange(false);
        pushToast({
          tone: 'success',
          title: 'Platform settings saved',
          description:
            result.changed.length > 0
              ? `${result.changed.map((k) => LABEL[k as FieldKey] ?? k).join(' and ')} changed · recorded in the audit log.`
              : 'Nothing had changed, so nothing was written.',
        });
        /* The stored row, its new version and "last changed" come back from
           the server, and the tab remounts on the new version (see
           `SettingsPanel`), so the form's baseline is the row. */
        router.refresh();
      } else {
        setError(result.error);
        setConflict(Boolean(result.conflict));
      }
    });
  }

  function reload() {
    setConfirmOpen(false);
    onDirtyChange(false);
    setConflict(false);
    setError(null);
    router.refresh();
  }

  return (
    <>
      <SettingsSection
        title="Platform identity"
        standfirst="The platform's name and the address customers are told to write to."
        action={
          <DataSource
            kind={live ? 'live' : 'designed'}
            explain={
              live
                ? 'Read from the platform settings row when this page loaded.'
                : 'No operator session: the designed values, read-only.'
            }
          />
        }
        footer={<LastChange store={store} />}
      >
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <TextField
            id="platform-name"
            label={LABEL.platformName}
            value={values.platformName}
            onChange={(v) => set('platformName', v)}
            readOnly={!live}
            was={changed.includes('platformName') ? saved.platformName : null}
            problem={changed.includes('platformName') ? problems.platformName : undefined}
          />
          <TextField
            id="support-email"
            label={LABEL.supportEmail}
            type="email"
            mono
            value={values.supportEmail}
            onChange={(v) => set('supportEmail', v)}
            readOnly={!live}
            was={changed.includes('supportEmail') ? saved.supportEmail : null}
            problem={changed.includes('supportEmail') ? problems.supportEmail : undefined}
          />
          <ReadOnlyField label="Currency" value={fixture.currency} />
          <ReadOnlyField label="Timezone" value={fixture.timezone} />
        </div>
        <p
          className="t-caption mt-4"
          style={{ color: 'var(--text-tertiary)', textWrap: 'pretty', maxWidth: '72ch' }}
        >
          Currency and timezone are properties of the product, not settings: every figure in the
          console is in shillings and every day boundary is midnight in Nairobi. Audit times are
          stored in UTC.
        </p>
      </SettingsSection>

      <SettingsSection
        title="What reads these"
        standfirst="Stated so a change here is not mistaken for one that reaches customers."
      >
        <ul className="m-0 grid list-none gap-4 p-0">
          <Reader icon={IconNotebook} title="This page and the audit log">
            Every save is a <span className="font-mono">platform.settings_updated</span> entry
            holding the fields that changed, before and after.
          </Reader>
          <Reader icon={IconMailForward} title="Not yet: outgoing email">
            Invitations and sign-up mail are sent from{' '}
            {mailFrom ? (
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                {mailFrom}
              </span>
            ) : (
              'an address that is not configured'
            )}
            , set in the deployment as <span className="font-mono">EMAIL_FROM</span>. The support
            address above is not attached to them yet.
          </Reader>
        </ul>
      </SettingsSection>

      {/* The console's one unsaved-changes bar, shared with the profile. It
          appears only while something differs from the stored row, and guards
          the browser tab while it does. */}
      <UnsavedBar
        dirty={live && dirty}
        pending={pending}
        invalid={!valid}
        message={
          !valid
            ? (problems.supportEmail ?? problems.platformName ?? 'Fix the highlighted field.')
            : `${changed.length} unsaved ${changed.length === 1 ? 'change' : 'changes'}`
        }
        saveLabel="Review and save"
        onSave={() => {
          setError(null);
          setConflict(false);
          setConfirmOpen(true);
        }}
        onDiscard={discard}
      />

      <ConsoleDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!pending) setConfirmOpen(next);
        }}
        dismissible={!pending}
        eyebrow="Platform settings"
        title={`Save ${changed.length === 1 ? 'this change' : `${changed.length} changes`}?`}
        operation="platform.settings_updated"
        description="These are platform-wide values. Check each one as it will be stored."
        facts={
          <>
            <DialogFact icon={IconNotebook}>
              Recorded in the platform audit log under your name, with the before and the after.
            </DialogFact>
            <DialogFact icon={IconMailForward}>
              Nothing customer-facing reads these yet. Outgoing mail still uses{' '}
              <span className="font-mono">EMAIL_FROM</span>.
            </DialogFact>
          </>
        }
        error={error}
        actions={
          conflict ? (
            <DialogActions confirmLabel="Reload their version" onConfirm={reload} />
          ) : (
            <DialogActions
              confirmLabel="Save settings"
              confirmIcon={IconDeviceFloppy}
              onConfirm={save}
              loading={pending}
            />
          )
        }
      >
        <dl className="m-0 grid gap-3">
          {changed.map((k) => (
            <div
              key={k}
              className="rounded-panel px-4 py-3"
              style={{
                background: 'var(--surface-sunken)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <dt
                className="font-mono text-2xs tracking-[0.12em] uppercase"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {LABEL[k]}
              </dt>
              <dd className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span
                  className="t-compact line-through"
                  style={{
                    color: 'var(--text-tertiary)',
                    fontFamily: k === 'supportEmail' ? 'var(--font-mono)' : undefined,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {saved[k]}
                </span>
                <IconArrowRight
                  size={14}
                  stroke={1.5}
                  aria-label="becomes"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <span
                  className="t-compact"
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    fontFamily: k === 'supportEmail' ? 'var(--font-mono)' : undefined,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {normal(k, values[k])}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </ConsoleDialog>
    </>
  );
}

function LastChange({ store }: { store: LiveSettings | null }) {
  const text = !store
    ? 'The designed view. Sign in as an operator to read and change the stored row.'
    : store.lastChange
      ? `Last changed by ${store.lastChange.by} · ${store.lastChange.at}${
          store.lastChange.fields.length > 0
            ? ` · ${store.lastChange.fields
                .map((f) => LABEL[f as FieldKey]?.toLowerCase() ?? f)
                .join(', ')}`
            : ''
        }`
      : 'Not changed since the settings store was created.';
  return (
    <p className="t-caption flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
      <IconHistory size={14} stroke={1.5} aria-hidden className="shrink-0" />
      <span>{text}</span>
    </p>
  );
}

function Reader({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof IconNotebook;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <Icon
        size={16}
        stroke={1.5}
        aria-hidden
        className="mt-0.5 shrink-0"
        style={{ color: 'var(--text-tertiary)' }}
      />
      <div className="min-w-0">
        <p className="t-compact" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {title}
        </p>
        <p
          className="t-caption mt-0.5"
          style={{ color: 'var(--text-secondary)', textWrap: 'pretty', maxWidth: '68ch' }}
        >
          {children}
        </p>
      </div>
    </li>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  readOnly,
  was,
  problem,
  type = 'text',
  mono = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  /** The stored value, when this field differs from it. */
  was: string | null;
  problem?: string;
  type?: 'text' | 'email';
  mono?: boolean;
}) {
  const edited = was !== null;
  const hintId = `${id}-hint`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="t-label mb-1.5 flex items-center gap-2">
        <span style={{ color: 'var(--text-primary)' }}>{label}</span>
        {edited ? (
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: problem ? 'var(--warning-fg)' : 'var(--blue-500)' }}
          />
        ) : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={problem ? true : undefined}
        aria-describedby={edited ? hintId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-chip px-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-500)]"
        style={{
          border: `1px solid ${problem ? 'var(--warning-fg)' : edited ? 'var(--blue-500)' : 'var(--border-strong)'}`,
          background: readOnly ? 'var(--surface-sunken)' : 'var(--surface-raised)',
          boxShadow: readOnly ? undefined : 'var(--neu-inset)',
          color: 'var(--text-primary)',
          font: `400 var(--type-body)/1 ${mono ? 'var(--font-mono)' : 'var(--font-ui)'}`,
          cursor: readOnly ? 'default' : undefined,
        }}
      />
      {edited ? (
        <p
          id={hintId}
          className="t-caption mt-1.5 truncate"
          style={{ color: problem ? 'var(--warning-fg)' : 'var(--text-tertiary)' }}
        >
          {problem ?? `Stored: ${was}`}
        </p>
      ) : null}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      <span
        className="flex h-10 items-center truncate rounded-chip px-3"
        style={{
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-sunken)',
          font: '400 var(--type-body)/1 var(--font-mono)',
          color: 'var(--text-secondary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
