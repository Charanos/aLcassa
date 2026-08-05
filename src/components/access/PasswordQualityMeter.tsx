'use client';

import { IconCheck, IconX } from '@tabler/icons-react';

interface PasswordQualityMeterProps {
  password?: string;
}

export function PasswordQualityMeter({ password = '' }: PasswordQualityMeterProps) {
  const rules = [
    { label: 'At least 12 characters', valid: password.length >= 12 },
    { label: 'Contains a number or symbol', valid: /[0-9!@#$%^&*()]/.test(password) },
    { label: 'Not commonly used', valid: password.length > 0 && !['password123', '123456789012'].includes(password.toLowerCase()) },
  ];

  const validCount = rules.filter((r) => r.valid).length;
  const percentage = Math.round((validCount / rules.length) * 100);

  return (
    <div className="mt-3 space-y-2 rounded-panel border p-3 bg-[var(--surface-sunken)] border-[var(--rule-soft)]">
      <div className="flex items-center justify-between t-caption">
        <span className="text-[var(--ink-secondary)]">Password strength</span>
        <span
          className={`t-eyebrow ${
            validCount === 3
              ? 'text-[var(--verdigris-ink)]'
              : validCount >= 1
              ? 'text-[var(--ochre-ink)]'
              : 'text-[var(--ink-tertiary)]'
          }`}
        >
          {validCount === 3 ? 'Strong' : validCount >= 1 ? 'Moderate' : 'Too weak'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-[var(--rule-soft)] overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background:
              validCount === 3
                ? 'var(--verdigris-solid)'
                : validCount >= 1
                ? 'var(--ochre-solid)'
                : 'var(--rule-strong)',
          }}
        />
      </div>

      {/* Checklist */}
      <ul className="space-y-1 pt-1">
        {rules.map((rule, i) => (
          <li key={i} className="flex items-center gap-2 t-caption text-xs">
            {rule.valid ? (
              <IconCheck size={14} className="text-[var(--verdigris-ink)]" />
            ) : (
              <IconX size={14} className="text-[var(--ink-faint)]" />
            )}
            <span className={rule.valid ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-tertiary)]'}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
