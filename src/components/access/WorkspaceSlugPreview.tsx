'use client';

import { useState } from 'react';
import { Field } from '@/components/primitives/Field';

/**
 * The company-name field and the workspace URL it produces.
 *
 * ⚠ IT NO LONGER SAYS "ASSIGNED", BECAUSE IT CANNOT ASSIGN ANYTHING.
 *
 * The old copy read "Assigned workspace URL: acme.alcassa.app", which is a
 * promise this component is in no position to make. `selfServeSignUp` claims
 * the slug inside the registration transaction and SUFFIXES a collision —
 * `acme-logistics` becomes `acme-logistics-2` if another business got there
 * first. A reader told their URL was assigned and then given a different one
 * has been misled by the form, on the screen where they are deciding whether
 * to trust us with their customers' conversations.
 *
 * So it states the rule instead: this is the URL, and a number is added if it
 * is already taken. That is exactly what the server does.
 *
 * ⚠ AND IT DOES NOT CHECK AVAILABILITY LIVE, WHICH IS A SECURITY DECISION
 * RATHER THAN A MISSING FEATURE. `ProvisionWorkspaceDialog` does check —
 * correctly, because the platform console is authenticated and its operator
 * is allowed to know which workspaces exist. A public endpoint answering
 * "is `safaricom` taken?" is a customer-list enumeration oracle on an
 * unauthenticated URL. The suffix rule exists so that this form never needs
 * to ask.
 *
 * The slugging here MIRRORS `slugStem` in `selfServeSignUp.ts` — same
 * lowercase, same separator collapse, same 40-character cut, same
 * `workspace` fallback for a name that cannot be slugged. If one moves, move
 * both, or the preview starts lying again in a quieter way.
 */

const MAX_STEM = 40;

function slugify(companyName: string): string {
  const stem = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_STEM)
    .replace(/-+$/g, '');

  // Under three characters the server falls back rather than registering it.
  return stem.length < 3 ? 'workspace' : stem;
}

export function WorkspaceSlugPreview() {
  const [companyName, setCompanyName] = useState('');
  const slug = companyName.trim() === '' ? 'your-company' : slugify(companyName);
  const typed = companyName.trim() !== '';

  return (
    <div className="space-y-1">
      <Field
        label="Company or organisation name"
        name="companyName"
        autoComplete="organization"
        required
        maxLength={120}
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Acme Logistics"
        helper="Visible to your team members and on client invitations."
      />

      <div className="-mt-1 rounded-xl border border-[var(--ink-200)]/80 bg-[var(--ink-50)]/60 px-3 py-2 shadow-2xs">
        <div className="flex items-center justify-between gap-3 text-[11.5px]">
          <span className="font-sans text-[var(--text-tertiary)]">Your workspace URL</span>
          <span
            className="truncate font-mono font-medium"
            style={{ color: typed ? 'var(--blue-600)' : 'var(--text-tertiary)' }}
          >
            {slug}.alcassa.app
          </span>
        </div>
        {/*
          The honest half. Stated once, quietly, rather than as a warning —
          it is not a problem, it is how the name is chosen.
        */}
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          If that name is already taken we add a number to it.
        </p>
      </div>
    </div>
  );
}
