/**
 * 07 §2. The error code catalogue.
 *
 * These strings are stable. The browser maps them to copy from 10 · Copy Deck,
 * and Phase 2 maps them to behaviour, so renaming one is a breaking API change
 * and belongs in /v2. Adding one is not.
 *
 * Every message here is written to be shown to a user. Where something is not
 * safe to display, the code stays generic and the detail goes to the log.
 */

export const ERROR_CODES = {
  // ─ Authentication and identity ─
  AUTH_INVALID_CREDENTIALS: 'auth.invalid_credentials',
  AUTH_ACCOUNT_LOCKED: 'auth.account_locked',
  AUTH_SESSION_EXPIRED: 'auth.session_expired',
  AUTH_EMAIL_UNVERIFIED: 'auth.email_unverified',
  AUTH_NO_MEMBERSHIP: 'auth.no_membership',
  /** A member whose role does not allow the action. Doc 24: ending a support
   *  visit is for owners and admins. */
  ROLE_NOT_PERMITTED: 'auth.role_not_permitted',

  // ─ Self-serve registration ─
  SIGNUP_EMAIL_TAKEN: 'signup.email_taken',
  SIGNUP_DISABLED: 'signup.disabled',

  // ─ Tenancy ─
  TENANT_SUSPENDED: 'tenant.suspended',
  TENANT_NOT_FOUND: 'tenant.not_found',
  TENANT_SETTINGS_CONFLICT: 'tenant.settings_conflict',

  // ─ Membership ─
  MEMBER_LAST_OWNER: 'member.last_owner',
  MEMBER_ALREADY_EXISTS: 'member.already_exists',

  // ─ Invitations ─
  INVITATION_EXPIRED: 'invitation.expired',
  INVITATION_ALREADY_ACCEPTED: 'invitation.already_accepted',
  INVITATION_REVOKED: 'invitation.revoked',

  // ─ Entitlements ─
  ENTITLEMENT_LIMIT_REACHED: 'entitlement.limit_reached',
  ENTITLEMENT_FEATURE_UNAVAILABLE: 'entitlement.feature_unavailable',
  SUBSCRIPTION_NOT_ACTIVE: 'subscription.not_active',

  // ─ Credentials ─
  CREDENTIAL_NOT_FOUND: 'credential.not_found',
  CREDENTIAL_REVOKED: 'credential.revoked',
  CREDENTIAL_SCOPE_MISSING: 'credential.scope_missing',
  CREDENTIAL_LIMIT_REACHED: 'credential.limit_reached',

  // ─ AI rules ─
  RULES_VERSION_CONFLICT: 'rules.version_conflict',
  RULES_FIELD_LOCKED: 'rules.field_locked',

  // ─ Support mode and platform ─
  SUPPORT_SESSION_EXPIRED: 'support.session_expired',
  SUPPORT_NOT_PERMITTED: 'support.not_permitted', // cannot ENTER support mode. See pipeline.ts.
  /** A platform operator without the capability the action needs. Doc 23. */
  PLATFORM_CAPABILITY_MISSING: 'platform.capability_missing',
  /** Platform settings saved over a version the operator never saw. Doc 23. */
  PLATFORM_SETTINGS_CONFLICT: 'platform.settings_conflict',
  /** A subscription changed between an operator reading it and changing it. Doc 25 · R1. */
  SUBSCRIPTION_CHANGED: 'platform.subscription_changed',
  /** 01 D-13, added 24 Aug 2026. A support session attempted one of the three
   *  permanent carve-outs: reading a credential secret, extending its own
   *  timeout, or acting as the member's own identity row. Distinct from
   *  SUPPORT_NOT_PERMITTED above, which blocks entry, not an action once in. */
  SUPPORT_WRITE_DENIED: 'support.write_denied',
  PLATFORM_NOT_ADMIN: 'platform.not_admin',

  // ─ Generic ─
  VALIDATION_FAILED: 'validation.failed',
  RATE_LIMIT_EXCEEDED: 'rate_limit.exceeded',
  NOT_FOUND: 'not_found',
  INTERNAL: 'internal',
  /**
   * An upstream this request depends on could not be reached at all.
   *
   * ⚠ IT EXISTS BECAUSE ITS ABSENCE MADE THE SIGN-IN ROUTE LIE. Any failure
   * from `signInWithPassword` was reported as `auth.invalid_credentials` —
   * including a DNS failure against the identity provider. "That email and
   * password do not match" is a confident, specific, WRONG claim to make when
   * the truth is that nothing was checked, and it sent two people looking for a
   * typo in a password for an afternoon.
   *
   * 503 rather than 500: the request was valid and may well succeed later.
   */
  UPSTREAM_UNAVAILABLE: 'upstream.unavailable',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * The status each code answers with.
 *
 * `404`, NEVER `403`, for a resource in another tenant. A 403 confirms the
 * resource exists, which is an information leak on a multi-tenant platform.
 * 07 §1 · 11 §6 rule 7. Note that TENANT_NOT_FOUND and NOT_FOUND are the only
 * codes a cross-tenant request can ever produce, and both are 404.
 */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 401,
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: 423,
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: 401,
  [ERROR_CODES.AUTH_EMAIL_UNVERIFIED]: 403,
  [ERROR_CODES.AUTH_NO_MEMBERSHIP]: 403,
  [ERROR_CODES.ROLE_NOT_PERMITTED]: 403,

  [ERROR_CODES.SIGNUP_EMAIL_TAKEN]: 409,
  [ERROR_CODES.SIGNUP_DISABLED]: 503,

  [ERROR_CODES.TENANT_SUSPENDED]: 403,
  [ERROR_CODES.TENANT_NOT_FOUND]: 404,
  [ERROR_CODES.TENANT_SETTINGS_CONFLICT]: 409,

  [ERROR_CODES.MEMBER_LAST_OWNER]: 409,
  [ERROR_CODES.MEMBER_ALREADY_EXISTS]: 409,

  [ERROR_CODES.INVITATION_EXPIRED]: 410,
  [ERROR_CODES.INVITATION_ALREADY_ACCEPTED]: 409,
  [ERROR_CODES.INVITATION_REVOKED]: 410,

  [ERROR_CODES.ENTITLEMENT_LIMIT_REACHED]: 403,
  [ERROR_CODES.ENTITLEMENT_FEATURE_UNAVAILABLE]: 403,
  [ERROR_CODES.SUBSCRIPTION_NOT_ACTIVE]: 403,

  [ERROR_CODES.CREDENTIAL_NOT_FOUND]: 404,
  [ERROR_CODES.CREDENTIAL_REVOKED]: 401,
  [ERROR_CODES.CREDENTIAL_SCOPE_MISSING]: 403,
  [ERROR_CODES.CREDENTIAL_LIMIT_REACHED]: 403,

  [ERROR_CODES.RULES_VERSION_CONFLICT]: 409,
  [ERROR_CODES.RULES_FIELD_LOCKED]: 403,

  [ERROR_CODES.SUPPORT_SESSION_EXPIRED]: 401,
  [ERROR_CODES.SUPPORT_NOT_PERMITTED]: 403,
  [ERROR_CODES.PLATFORM_CAPABILITY_MISSING]: 403,
  [ERROR_CODES.PLATFORM_SETTINGS_CONFLICT]: 409,
  [ERROR_CODES.SUBSCRIPTION_CHANGED]: 409,
  [ERROR_CODES.SUPPORT_WRITE_DENIED]: 403,
  [ERROR_CODES.PLATFORM_NOT_ADMIN]: 403,

  [ERROR_CODES.VALIDATION_FAILED]: 422,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.INTERNAL]: 500,
  [ERROR_CODES.UPSTREAM_UNAVAILABLE]: 503,
};

/**
 * Default messages, from 10 · Copy Deck. A handler may pass a more specific
 * message; it may not invent a tone. No em dashes, no exclamation marks, and
 * never an apology for the system.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'That email and password do not match.',
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: 'Too many sign-in attempts. Try again shortly.',
  [ERROR_CODES.AUTH_SESSION_EXPIRED]:
    'You have been signed out. Sign in again and we will bring you back here.',
  [ERROR_CODES.AUTH_EMAIL_UNVERIFIED]: 'Confirm your email before continuing.',
  [ERROR_CODES.AUTH_NO_MEMBERSHIP]:
    'Your account is not attached to a workspace. If you were invited, use the link in your invitation email. Otherwise get in touch.',

  /* Names the way out rather than the failure. Someone who already has an
     account and tried to register again does not need to be told 'taken' —
     they need the sign-in link, which the sign-up page renders beside this. */
  [ERROR_CODES.ROLE_NOT_PERMITTED]:
    'Your role in this workspace cannot do that. An owner or admin can.',
  [ERROR_CODES.SIGNUP_EMAIL_TAKEN]:
    'That email already has an account. Sign in instead, or reset your password if you have forgotten it.',
  [ERROR_CODES.SIGNUP_DISABLED]:
    'New workspaces are not open for self-registration right now. Get in touch and we will set yours up.',

  [ERROR_CODES.TENANT_SUSPENDED]:
    'This workspace is suspended. You can still see everything here; changes are paused until this is resolved. Get in touch to resolve it.',
  [ERROR_CODES.TENANT_NOT_FOUND]: 'That is not here, or you do not have access to it.',
  [ERROR_CODES.TENANT_SETTINGS_CONFLICT]:
    'Company settings changed while you were editing. Reload to review the latest settings before saving again.',

  [ERROR_CODES.MEMBER_LAST_OWNER]:
    'Every workspace needs an owner. Transfer ownership before removing this account.',
  [ERROR_CODES.MEMBER_ALREADY_EXISTS]: 'That person is already on this team.',

  [ERROR_CODES.INVITATION_EXPIRED]: 'This invitation has expired. Ask for a new one.',
  [ERROR_CODES.INVITATION_ALREADY_ACCEPTED]: 'This invitation has already been accepted.',
  [ERROR_CODES.INVITATION_REVOKED]: 'This invitation was withdrawn.',

  [ERROR_CODES.ENTITLEMENT_LIMIT_REACHED]:
    'You have reached the limit for your plan. Review your plan to add more.',
  [ERROR_CODES.ENTITLEMENT_FEATURE_UNAVAILABLE]: 'Your plan does not include this.',
  [ERROR_CODES.SUBSCRIPTION_NOT_ACTIVE]: 'This workspace does not have an active subscription.',

  [ERROR_CODES.CREDENTIAL_NOT_FOUND]: 'That is not here, or you do not have access to it.',
  [ERROR_CODES.CREDENTIAL_REVOKED]:
    'This credential was revoked. Ask the workspace owner for a new credential.',
  [ERROR_CODES.CREDENTIAL_SCOPE_MISSING]:
    'This credential does not have the required permission. Ask the workspace owner to create a credential with the required scope.',
  [ERROR_CODES.CREDENTIAL_LIMIT_REACHED]: 'You have created every credential your plan includes.',

  [ERROR_CODES.RULES_VERSION_CONFLICT]:
    'These rules were changed while you were editing. Review the differences before publishing.',
  [ERROR_CODES.RULES_FIELD_LOCKED]: 'This is set by the platform and cannot be changed here.',

  [ERROR_CODES.SUPPORT_SESSION_EXPIRED]: 'Your support visit ended. Start a new visit to continue.',
  [ERROR_CODES.SUPPORT_NOT_PERMITTED]: 'This account cannot enter support mode.',
  [ERROR_CODES.PLATFORM_CAPABILITY_MISSING]:
    'You do not have permission to do this. Ask a platform administrator to review your access.',
  [ERROR_CODES.PLATFORM_SETTINGS_CONFLICT]:
    'Another operator saved these settings after you opened the page. Reload to see their version, then make your change again.',
  [ERROR_CODES.SUBSCRIPTION_CHANGED]:
    'This subscription changed while you were deciding. Reload the workspace and check it before changing it.',
  [ERROR_CODES.SUPPORT_WRITE_DENIED]: 'Support mode cannot do this here.',
  [ERROR_CODES.PLATFORM_NOT_ADMIN]: 'This account does not manage the platform.',

  [ERROR_CODES.VALIDATION_FAILED]: 'Check your entries and try again.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Wait a moment and try again.',
  [ERROR_CODES.NOT_FOUND]: 'That is not here, or you do not have access to it.',
  [ERROR_CODES.INTERNAL]:
    "We couldn't complete this request. Try again, or contact support if it continues.",
  [ERROR_CODES.UPSTREAM_UNAVAILABLE]:
    'The service needed for this request is temporarily unavailable. Try again shortly.',
};
