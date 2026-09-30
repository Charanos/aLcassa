/**
 * What the Settings page states about the platform, in one place.
 *
 * ⚠ THE SECURITY TAB USED TO DRAW FIVE TOGGLES, AND THREE OF THEM WERE FALSE.
 *
 *   "Require two-factor for all platform admins" was on and locked. No sign-in
 *   step checks a second factor.
 *   "Sign out after inactivity · 2 hours" was on. No idle timer exists; a
 *   console session ends twelve hours after sign-in, used or not.
 *   "Restrict console access by IP range · 2 ranges" named ranges that are
 *   stored nowhere.
 *
 * And the one that was real was described wrongly: support sessions were "hard
 * expiry with no extension", while the console has an Extend button. A client
 * reading that tab would have been told of four controls that do not exist.
 * Doc 23.
 *
 * So there are no toggles. Nothing on this tab is configurable — the enforced
 * controls are code, and changing one is a release, not a setting — and a
 * switch that cannot move is decoration pretending to be a control. Each
 * enforced line names where it is enforced, so the claim can be checked. The
 * lines that are not built say so, in a list of their own.
 */

export type Control = {
  key: string;
  label: string;
  detail: string;
  /** Where the control is enforced. Present on every enforced control. */
  where?: string;
  /** The number, where the control has one. */
  value?: string;
};

export const ENFORCED_CONTROLS: readonly Control[] = [
  {
    key: 'reason',
    label: 'A reason for every support session',
    detail:
      'At least eight characters, written to the customer’s own activity log, where they read it.',
    where: 'startSupportSession',
    value: 'Required',
  },
  {
    key: 'length',
    label: 'Support sessions end after thirty minutes',
    detail:
      'Extending opens in the last five minutes, at most twice, and each extension is recorded in the customer’s log. After that, a new session with a new reason. A session cannot extend itself from inside the workspace.',
    where: 'extendSupportSession · sessions_modify policy',
    value: '30 min',
  },
  {
    key: 'capabilities',
    label: 'Operator capabilities are checked on every platform action',
    detail:
      'Workspace management, master rules and support access are read from each operator’s record inside the transaction of the call they govern. A refusal writes nothing.',
    where: 'requireCapability',
  },
  {
    key: 'console-session',
    label: 'Console sign-ins last twelve hours',
    detail:
      'Every session is a row with its device and address. Revoking one ends it on the next request, not at expiry.',
    where: 'createSession',
    value: '12 h',
  },
];

export const PLANNED_CONTROLS: readonly Control[] = [
  {
    key: 'mfa',
    label: 'Two-factor required for operators',
    detail:
      'Operators can enrol with the identity provider, but signing in to the console does not yet require a second factor.',
  },
  {
    key: 'idle',
    label: 'Sign out after inactivity',
    detail: 'No idle timer. A console session ends twelve hours after sign-in, used or not.',
  },
  {
    key: 'ip',
    label: 'Restrict console access by address',
    detail:
      'Sign-ins are accepted from any address. Each one is recorded with its address on the operator’s profile.',
  },
];

/**
 * Notifications the design calls for. None is sent today.
 *
 * ⚠ THESE WERE SWITCHES THAT SAVED NOWHERE, for alerts that no code raises.
 * Drawn as the design's intent — which channel each would use — rather than
 * as controls, until there is a sender behind them.
 */
export const DESIGNED_NOTIFICATIONS: ReadonlyArray<{
  key: string;
  label: string;
  detail: string;
  console: boolean;
  email: boolean;
}> = [
  {
    key: 'payment',
    label: 'A payment fails',
    detail: 'First failure, not each retry.',
    console: true,
    email: true,
  },
  {
    key: 'limit',
    label: 'A workspace crosses 90% of a limit',
    detail: 'Once per limit per period.',
    console: true,
    email: false,
  },
  {
    key: 'trial',
    label: 'A trial is three days from ending',
    detail: 'Only for trials with recent sign-in activity.',
    console: true,
    email: true,
  },
  {
    key: 'session',
    label: 'Another operator starts a support session',
    detail: 'With the reason they gave.',
    console: true,
    email: false,
  },
  {
    key: 'admin',
    label: 'Platform access is granted or revoked',
    detail: 'To every operator, without exception.',
    console: true,
    email: true,
  },
];

/**
 * What the platform keeps, and for how long — as it is today.
 *
 * ⚠ THE OLD LIST GAVE PERIODS NOTHING ENFORCES. "Three years" for the audit
 * log, "90 days" for health samples, "12 months" for a suspended workspace:
 * no job deletes anything on a schedule, so each was a promise the platform
 * was not keeping. What is true is simpler, and for the audit logs stronger.
 */
export const RETENTION: ReadonlyArray<{ label: string; detail: string; value: string }> = [
  {
    label: 'Audit logs',
    detail: 'Append-only by policy: no update or delete exists for anyone, including the platform.',
    value: 'Kept',
  },
  {
    label: 'Support session records',
    detail: 'Reason, length, and who ended it — in the platform log and the customer’s own.',
    value: 'Kept',
  },
  {
    label: 'Suspended workspaces',
    detail: 'Suspension is read-only access, not deletion. Reactivation is a single action.',
    value: 'Kept',
  },
];
