'use client';

import { useState } from 'react';
import { Field } from '@/components/primitives/Field';

export function WorkspaceSlugPreview() {
  const [companyName, setCompanyName] = useState('');

  const slug =
    companyName
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
      <div
        className="t-caption flex items-center justify-between rounded-chip border px-3 py-2"
        style={{
          background: 'var(--surface-sunken)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <span style={{ color: 'var(--text-tertiary)' }}>Workspace URL:</span>
        <span className="t-data font-mono font-medium" style={{ color: 'var(--text-action)' }}>
          {slug}.alcassa.app
        </span>
      </div>
    </div>
  );
}
