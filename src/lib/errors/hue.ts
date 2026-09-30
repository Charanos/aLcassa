import { ERROR_CODES, type ErrorCode } from './catalogue';

/**
 * Sheet 12 · "Refusals," laid over the existing catalogue in `catalogue.ts`
 * rather than beside it. The codes, statuses and copy already existed —
 * `07 §2` — this file adds the one thing sheet 12 asks for that they do not
 * carry: which of three hues a code renders in.
 *
 *   OCHRE resolves — the reader can act (a limit, a rate, a bad value).
 *   OXIDE refuses  — the reader must ask someone (suspended, forbidden, a
 *                     write that failed).
 *   SLATE informs  — nothing is wrong (not found, an already-true state).
 *
 * The console's own server actions (`suspendWorkspace`, `applyPlanChange`,
 * `toggleBreakGlass`) return `{ ok: false, error }` rather than an `AppError`
 * — they are typed function results, not HTTP responses, and the envelope
 * `AppError.toBody()` builds has no caller here. Both shapes read `message`
 * as the one thing a person sees; only requests that cross an HTTP boundary
 * need `catalogue.ts`'s status codes on top of it.
 */

export type ErrorHue = 'ochre' | 'oxide' | 'slate';

const HUE: Record<ErrorCode, ErrorHue> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'ochre',
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: 'ochre',
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: 'ochre',
  [ERROR_CODES.AUTH_EMAIL_UNVERIFIED]: 'ochre',
  [ERROR_CODES.AUTH_NO_MEMBERSHIP]: 'oxide',

  /* OCHRE: the reader retypes an address or follows the sign-in link and
     continues. OXIDE would say 'nothing you can do', which is untrue. */
  [ERROR_CODES.SIGNUP_EMAIL_TAKEN]: 'ochre',
  /* OXIDE: self-registration being closed is a decision, not a retry. */
  [ERROR_CODES.SIGNUP_DISABLED]: 'oxide',

  [ERROR_CODES.TENANT_SUSPENDED]: 'oxide',
  [ERROR_CODES.TENANT_NOT_FOUND]: 'slate',

  [ERROR_CODES.MEMBER_LAST_OWNER]: 'ochre',
  [ERROR_CODES.MEMBER_ALREADY_EXISTS]: 'slate',

  [ERROR_CODES.INVITATION_EXPIRED]: 'oxide',
  [ERROR_CODES.INVITATION_ALREADY_ACCEPTED]: 'slate',
  [ERROR_CODES.INVITATION_REVOKED]: 'oxide',

  [ERROR_CODES.ENTITLEMENT_LIMIT_REACHED]: 'ochre',
  [ERROR_CODES.ENTITLEMENT_FEATURE_UNAVAILABLE]: 'ochre',
  [ERROR_CODES.SUBSCRIPTION_NOT_ACTIVE]: 'oxide',

  [ERROR_CODES.CREDENTIAL_NOT_FOUND]: 'slate',
  [ERROR_CODES.CREDENTIAL_REVOKED]: 'oxide',
  [ERROR_CODES.CREDENTIAL_SCOPE_MISSING]: 'ochre',
  [ERROR_CODES.CREDENTIAL_LIMIT_REACHED]: 'ochre',

  [ERROR_CODES.RULES_VERSION_CONFLICT]: 'ochre',
  [ERROR_CODES.RULES_FIELD_LOCKED]: 'slate',

  [ERROR_CODES.SUPPORT_SESSION_EXPIRED]: 'ochre',
  [ERROR_CODES.SUPPORT_NOT_PERMITTED]: 'oxide',
  [ERROR_CODES.PLATFORM_CAPABILITY_MISSING]: 'oxide',
  // Reload and redo — something the reader can act on, so ochre.
  [ERROR_CODES.PLATFORM_SETTINGS_CONFLICT]: 'ochre',
  // 01 D-13. One of the three permanent carve-outs was attempted. OXIDE rather
  // than OCHRE because there is nothing the reader can do about it: the ceiling
  // is the point, not a limit that a plan change or a retry would lift.
  [ERROR_CODES.SUPPORT_WRITE_DENIED]: 'oxide',
  [ERROR_CODES.PLATFORM_NOT_ADMIN]: 'oxide',

  [ERROR_CODES.VALIDATION_FAILED]: 'ochre',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'ochre',
  [ERROR_CODES.NOT_FOUND]: 'slate',
  [ERROR_CODES.INTERNAL]: 'oxide',
  [ERROR_CODES.UPSTREAM_UNAVAILABLE]: 'oxide',
};

export function hueOf(code: ErrorCode): ErrorHue {
  return HUE[code];
}

const HUE_TOKENS: Record<ErrorHue, { fg: string; bg: string; rule: string }> = {
  ochre: { fg: 'var(--amber-500)', bg: 'var(--warning-bg)', rule: 'var(--warning-fg)' },
  oxide: {
    fg: 'var(--red-500)',
    bg: 'var(--red-100)',
    rule: 'color-mix(in oklab, var(--red-500) 38%, var(--surface-base))',
  },
  slate: { fg: 'var(--ink-600)', bg: 'var(--surface-sunken)', rule: 'var(--border-subtle)' },
};

/** The three tokens a component needs to render a code in its hue, without
 *  every call site re-deriving the mapping for itself. */
export function hueTokens(code: ErrorCode) {
  return HUE_TOKENS[hueOf(code)];
}

/**
 * Sheet 12: "a limit is not an error." An entitlement refusal names the
 * ceiling and the plan that raises it; the control that hit it stays visible
 * and disabled rather than removed, which is what would make the entitlement
 * look like a missing feature instead of a number the reader can act on.
 */
export function entitlementDetail(input: {
  resource: string;
  limit: number;
  plan?: string;
}): string {
  const upgrade = input.plan ? ` Upgrade past ${input.plan} to raise it.` : '';
  return `${input.resource} is at its limit of ${input.limit.toLocaleString('en-GB')}.${upgrade}`;
}
