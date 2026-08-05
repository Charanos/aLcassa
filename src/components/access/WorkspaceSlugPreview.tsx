'use client';

import { useState } from 'react';
import { Field } from '@/components/primitives/Field';

export function WorkspaceSlugPreview() {
  const [companyName, setCompanyName] = useState('');

  const slug = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'acme';

  return (
    <div className="space-y-2">
      <Field
        label="Company name"
        name="companyName"
        autoComplete="organization"
        required
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Acme Logistics"
        helper="Shown to your team and on their invitations."
      />

      {/* Live Slug Preview */}
      <div className="flex items-center justify-between rounded-chip border px-3 py-2 bg-[var(--surface-sunken)] border-[var(--rule-soft)] t-caption">
        <span className="text-[var(--ink-tertiary)]">Workspace URL:</span>
        <span className="t-data text-[var(--copper-ink)]">
          {slug}.conduit.app
        </span>
      </div>
    </div>
  );
}
