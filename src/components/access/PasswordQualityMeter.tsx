'use client';

import { useMemo } from 'react';
import { IconCheck, IconX } from '@tabler/icons-react';

/**
 * The strength readout under a new-password field.
 *
 * ⚠ RULE ONE IS THE SERVER'S RULE, NOT A SUGGESTION. `min(12)` in
 * `api/v1/auth/password/reset` is the policy this mirrors, so the meter and
 * the endpoint agree on what will actually be accepted. The other two rules
 * are ADVICE the server does not enforce — which is the safe direction to
 * disagree in, because it asks for more than the gate requires and can never
 * show a reader "Robust" on something the API will then reject. If the server
 * policy ever moves, MIN_LENGTH moves with it.
 *
 * ⚠ THE "COMMONLY USED" TEST USED TO BE THEATRE. It compared against a
 * two-item list and passed for any string of length ≥ 1 outside it, so it was
 * green on effectively every password ever typed and inflated the score by a
 * third for nothing. It now tests the shapes that actually make a password
 * guessable — a single repeated character, a run of sequential digits, all
 * digits, and the common-root words that top every breach corpus — which is
 * still not zxcvbn, and is not claimed to be. It is an honest hint, so it is
 * labelled as one.
 */

const MIN_LENGTH = 12;

/** Roots that dominate every published breach corpus, matched as substrings
 *  so `Password123!` and `myqwerty99` are both caught. */
const WEAK_ROOTS = [
  'password',
  'qwerty',
  'letmein',
  'welcome',
  'admin',
  'iloveyou',
  'monkey',
  'dragon',
  'football',
  'abc123',
  'alcassa',
];

/** `aaaaaaaaaaaa`, `123456789012`, `987654321098` — long but trivially guessed. */
function isLowEntropyShape(value: string): boolean {
  if (value.length === 0) return true;
  if (/^(.)\1+$/.test(value)) return true;
  if (/^\d+$/.test(value)) return true;

  const sequential = (step: 1 | -1) =>
    value
      .split('')
      .every(
        (char, i) =>
          i === 0 || char.charCodeAt(0) === value.charCodeAt(i - 1) + step
      );

  return value.length > 3 && (sequential(1) || sequential(-1));
}

export function PasswordQualityMeter({ password = '' }: { password?: string }) {
  const { rules, validCount, percentage, label, ink } = useMemo(() => {
    const lower = password.toLowerCase();

    const rules = [
      {
        label: `At least ${MIN_LENGTH} characters`,
        valid: password.length >= MIN_LENGTH,
      },
      {
        label: 'Contains a number or symbol',
        valid: /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password),
      },
      {
        label: 'Not an easily guessed pattern',
        valid:
          password.length > 0 &&
          !isLowEntropyShape(password) &&
          !WEAK_ROOTS.some((root) => lower.includes(root)),
      },
    ];

    const validCount = rules.filter((r) => r.valid).length;

    /* The bar tracks rules met, but an entry too short for the server to
       accept never reads past a third however many hints it satisfies —
       otherwise a nine-character password with a symbol shows two thirds
       full and is then refused on submit. */
    const meetsPolicy = rules[0]!.valid;
    const percentage = meetsPolicy ? Math.round((validCount / rules.length) * 100) : 33;

    const strong = validCount === rules.length;
    const label = strong ? 'Robust' : meetsPolicy ? 'Moderate' : 'Too weak';
    const ink = strong
      ? 'var(--success-fg)'
      : meetsPolicy
        ? 'var(--warning-fg)'
        : 'var(--text-tertiary)';

    return { rules, validCount, percentage, label, ink };
  }, [password]);

  return (
    <div className="mt-2.5 space-y-2 rounded-xl border border-[var(--ink-200)]/80 bg-[var(--ink-50)]/60 p-3.5 shadow-2xs transition-all">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-[var(--text-secondary)]">Password security</span>
        {/*
          ⚠ `aria-live` IS THE WHOLE POINT OF THIS SPAN. The word is the only
          summary of the readout, and it changes as the reader types. Without
          the live region a screen-reader user gets silence while a sighted
          one watches it move from "Too weak" to "Robust".
        */}
        <span
          aria-live="polite"
          className="font-mono text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: ink }}
        >
          {label}
        </span>
      </div>

      {/* The bar restates the label visually, so it is hidden from the
          accessibility tree rather than announced a second time. */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ink-200)]/80"
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: ink === 'var(--text-tertiary)' ? 'var(--ink-400)' : ink,
          }}
        />
      </div>

      {/* Each rule announces its own pass/fail through the icon's label, so
          the list is navigable rather than a wall of undifferentiated text. */}
      <ul className="space-y-1.5 pt-1">
        {rules.map((rule) => (
          <li key={rule.label} className="flex items-center gap-2 text-[11.5px]">
            {rule.valid ? (
              <IconCheck
                size={13}
                stroke={2.5}
                className="shrink-0"
                style={{ color: 'var(--success-fg)' }}
                aria-hidden
              />
            ) : (
              <IconX size={13} stroke={2} className="shrink-0 text-[var(--ink-400)]" aria-hidden />
            )}
            <span
              className={
                rule.valid
                  ? 'font-medium text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)]'
              }
            >
              {rule.label}
            </span>
            <span className="sr-only">{rule.valid ? ' — met' : ' — not met'}</span>
          </li>
        ))}
      </ul>

      <span className="sr-only">
        {validCount} of {rules.length} password recommendations met.
      </span>
    </div>
  );
}
