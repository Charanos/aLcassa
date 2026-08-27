'use client';

import { useState, useTransition } from 'react';
import { Field } from '@/components/primitives/Field';
import { Button } from '@/components/primitives/Button';
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
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    name !== model.name ||
    contactEmail !== model.contactEmail ||
    timezone !== model.timezone ||
    locale !== model.locale;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateCompany({ name, contactEmail, timezone, locale });
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-5">
      <Field
        label="Company name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
      />
      <Field
        label="Contact email"
        type="email"
        value={contactEmail}
        onChange={(e) => {
          setContactEmail(e.target.value);
          setSaved(false);
        }}
        helper="Where customers and Andishi reach you about this workspace."
      />

      <label className="grid gap-1.5">
        <span className="t-label text-[var(--ink-secondary)]">Timezone</span>
        <select
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            setSaved(false);
          }}
          className="field-sunken t-body h-10 rounded-chip border px-3 text-[var(--ink-primary)]"
          style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-sunken)' }}
        >
          <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
          <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
          <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
          <option value="UTC">UTC</option>
        </select>
        <span className="t-caption min-h-[18px] text-[var(--ink-tertiary)]">
          Every timestamp in the product renders in this zone, with the UTC value on hover.
        </span>
      </label>

      <label className="grid gap-1.5">
        <span className="t-label text-[var(--ink-secondary)]">Locale</span>
        <select
          value={locale}
          onChange={(e) => {
            setLocale(e.target.value);
            setSaved(false);
          }}
          className="field-sunken t-body h-10 rounded-chip border px-3 text-[var(--ink-primary)]"
          style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-sunken)' }}
        >
          <option value="en-KE">English (Kenya)</option>
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
        </select>
        <span className="t-caption min-h-[18px]" aria-hidden />
      </label>

      {error ? (
        <p role="alert" className="t-compact" style={{ color: 'var(--oxide-ink)' }}>
          {error}
        </p>
      ) : null}

      <div
        className="flex items-center gap-3 border-t pt-5"
        style={{ borderColor: 'var(--rule-soft)' }}
      >
        <Button type="submit" variant="primary" loading={pending} disabled={!dirty || pending}>
          Save changes
        </Button>
        {saved ? (
          <span className="t-compact" style={{ color: 'var(--verdigris-ink)' }}>
            Saved
          </span>
        ) : dirty ? (
          <span className="t-compact text-[var(--ink-tertiary)]">Unsaved changes</span>
        ) : null}
      </div>
    </form>
  );
}
