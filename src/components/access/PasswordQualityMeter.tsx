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
    <div
      className="mt-3 space-y-2 rounded-panel border p-3.5"
      style={{
        background: 'var(--surface-sunken)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="flex items-center justify-between t-caption">
        <span style={{ color: 'var(--text-secondary)' }}>Password strength</span>
        <span
          className={`t-eyebrow font-medium ${
            validCount === 3
              ? 'text-emerald-600 dark:text-emerald-400'
              : validCount >= 1
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-[var(--text-tertiary)]'
          }`}
        >
          {validCount === 3 ? 'Strong' : validCount >= 1 ? 'Moderate' : 'Too weak'}
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: 'var(--border-subtle)' }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background:
              validCount === 3
                ? 'var(--success-fg)'
                : validCount >= 1
                ? 'var(--accent-mark)'
                : 'var(--border-strong)',
          }}
        />
      </div>

      {/* Checklist */}
      <ul className="space-y-1 pt-1">
        {rules.map((rule, i) => (
          <li key={i} className="flex items-center gap-2 t-caption text-xs">
            {rule.valid ? (
              <IconCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <IconX size={14} style={{ color: 'var(--text-disabled)' }} />
            )}
            <span style={{ color: rule.valid ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
