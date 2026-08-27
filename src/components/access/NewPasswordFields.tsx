'use client';

import { useState } from 'react';
import { PasswordField } from '@/components/primitives/Field';
import { PasswordQualityMeter } from './PasswordQualityMeter';

/**
 * The two password fields plus the live quality meter, for every screen that
 * SETS a password rather than checks one.
 *
 * ⚠ THIS EXISTS SO THE SERVER'S RULE IS VISIBLE BEFORE SUBMISSION.
 *
 * `POST /v1/auth/password/reset` requires twelve characters and that the two
 * fields match. Both are real checks with real refusals — and until now the
 * only way to discover either was to submit and be told. `PasswordQualityMeter`
 * had been built for exactly this and was imported nowhere.
 *
 * The rules the meter shows are the SAME rules the route enforces. That is the
 * point: a meter that encourages a symbol the server does not require is
 * theatre, and one that omits a rule the server does require is a trap.
 *
 * ⚠ IT IS A CLIENT COMPONENT, AND THE FORM AROUND IT IS NOT.
 *
 * The pages that use this stay server-rendered `<form method="post">`, which
 * `02 §9` and the sign-in route's own comment argue for: a password screen
 * that needs a bundle to work breaks in exactly the conditions where somebody
 * most needs to get in. This component enhances that form without owning its
 * submission — remove the JavaScript and the fields still post, the server
 * still enforces both rules, and only the live feedback is lost.
 */
export function NewPasswordFields({
  /** The name the route reads. Differs between reset and invitation accept. */
  confirmName = 'passwordConfirm',
  label = 'New password',
  showConfirm = true,
}: {
  confirmName?: string;
  label?: string;
  showConfirm?: boolean;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Only once they have typed something in the second field. Telling someone
  // the passwords do not match before they have finished typing the second
  // one is a warning about a state they are still on their way out of.
  const mismatch = showConfirm && confirm.length > 0 && confirm !== password;

  return (
    <>
      <PasswordField
        label={label}
        name="password"
        autoComplete="new-password"
        required
        minLength={12}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        helper="At least 12 characters."
      />

      {/* Only once there is something to measure. An empty meter on page load
          reads as three failed checks rather than as nothing typed yet. */}
      {password.length > 0 ? <PasswordQualityMeter password={password} /> : null}

      {showConfirm ? (
        <PasswordField
          label="Confirm new password"
          name={confirmName}
          autoComplete="new-password"
          required
          minLength={12}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'Both passwords must match.' : undefined}
        />
      ) : null}
    </>
  );
}
