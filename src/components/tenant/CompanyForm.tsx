'use client';

import { useState, useTransition } from 'react';
import { Field } from '@/components/primitives/Field';
import { Button } from '@/components/primitives/Button';
import { useUnsavedChanges } from '@/components/structure/UnsavedChangesBoundary';
import { updateCompany } from '@/app/(tenant)/app/actions';
import type { CompanyModel } from '@/lib/tenant/data';

/**
 * 02 §4 · 03 §13. Company settings.
 *
 * ⚠ NO AUTOSAVE. "Tenant-facing forms never autosave: the owner decides when
 * something is committed." Every field is local state until Save is pressed,
 * and a failed save PRESERVES every value — a form that clears itself on a
 * server error is a defect (03 §13).
 */
export function CompanyForm({ model }: { model: CompanyModel }) {
  const [name, setName] = useState(model.name);
  const [contactEmail, setContactEmail] = useState(model.contactEmail);
  const [timezone, setTimezone] = useState(model.timezone);
  const [locale, setLocale] = useState(model.locale);
  // Keep the version of the values this editor actually loaded. A refreshed
  // server prop must not silently authorize overwriting another editor's work.
  const [baseline, setBaseline] = useState(model);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    name !== baseline.name ||
    contactEmail !== baseline.contactEmail ||
    timezone !== baseline.timezone ||
    locale !== baseline.locale;
  const form = useUnsavedChanges(dirty, pending);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const values = {
        name: name.trim(),
        contactEmail: contactEmail.trim(),
        timezone,
        locale,
        version: baseline.version,
      };
      try {
        const result = await updateCompany(values);
        if (result.ok) {
          setName(values.name);
          setContactEmail(values.contactEmail);
          setBaseline({ ...baseline, ...values, version: result.version });
          setSaved(true);
        } else setError(result.error);
      } catch {
        setError(
          'The save could not be confirmed. Your draft is still here. Reload and check the company details before saving again.',
        );
      }
    });
  }

  return (
    <form ref={form} onSubmit={submit} className="grid max-w-xl gap-5">
      <fieldset disabled={pending} className="grid min-w-0 gap-5">
        <Field
          label="Company name"
          required
          maxLength={200}
          autoComplete="organization"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
        <Field
          label="Contact email"
          type="email"
          required
          maxLength={320}
          autoComplete="email"
          value={contactEmail}
          onChange={(e) => {
            setContactEmail(e.target.value);
            setSaved(false);
          }}
          helper="The contact address for this workspace."
        />

        <label className="grid gap-1.5">
          <span className="t-label text-[var(--text-secondary)]">Timezone</span>
          <select
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              setSaved(false);
            }}
            className="field-sunken t-body h-10 rounded-chip border px-3 text-[var(--text-primary)]"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
          >
            <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
            <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
            <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
            <option value="UTC">UTC</option>
            {!['Africa/Nairobi', 'Africa/Lagos', 'Africa/Johannesburg', 'UTC'].includes(
              timezone,
            ) ? (
              <option value={timezone}>{timezone}</option>
            ) : null}
          </select>
          <span className="t-caption min-h-[18px] text-[var(--text-tertiary)]">
            The timezone selected for this workspace.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="t-label text-[var(--text-secondary)]">Number and date format</span>
          <select
            value={locale}
            onChange={(e) => {
              setLocale(e.target.value);
              setSaved(false);
            }}
            className="field-sunken t-body h-10 rounded-chip border px-3 text-[var(--text-primary)]"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
          >
            <option value="en-KE">English (Kenya)</option>
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
          </select>
          <span className="t-caption min-h-[18px]" aria-hidden />
        </label>
      </fieldset>

      {error ? (
        <p role="alert" className="t-compact" style={{ color: 'var(--red-500)' }}>
          {error}
        </p>
      ) : null}

      <div
        className="flex items-center gap-3 border-t pt-5"
        style={{ borderColor: 'var(--ink-100)' }}
      >
        <Button type="submit" variant="primary" loading={pending} disabled={!dirty || pending}>
          Save changes
        </Button>
        {saved ? (
          <span role="status" className="t-compact" style={{ color: 'var(--green-500)' }}>
            Saved
          </span>
        ) : dirty ? (
          <span className="t-compact text-[var(--text-tertiary)]">Unsaved changes</span>
        ) : null}
      </div>
    </form>
  );
}
