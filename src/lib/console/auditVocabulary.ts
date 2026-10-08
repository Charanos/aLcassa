import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconBuildingPlus,
  IconCreditCard,
  IconDoorEnter,
  IconDoorExit,
  IconDownload,
  IconEye,
  IconKey,
  IconLock,
  IconLockOpen,
  IconMail,
  IconPencil,
  IconPhoto,
  IconPlayerPause,
  IconPlayerPlay,
  IconRobot,
  IconShieldLock,
  IconTransfer,
  IconTrash,
  IconUserCheck,
  IconUserMinus,
  IconUserPlus,
  IconUserShield,
  type Icon as TablerIcon,
} from '@tabler/icons-react';

/**
 * WHAT AN AUDIT ACTION MEANS, IN ENGLISH, WITH THE ICON THAT CARRIES IT.
 *
 * ⚠ THIS FILE CARRIES NO DIRECTIVE. The overview's audit tail is a server
 * component, the tenant activity tab is a client one, and the audit page is
 * server-rendered — so this has to be importable from both sides. 18 §13: a
 * `'use client'` file must never become the home of a shared value, because a
 * server component importing one gets a reference proxy and every read is
 * `undefined` at runtime, silently.
 *
 * ⚠ EVERY SURFACE WAS PRINTING THE RAW STRING. `password.changed`,
 * `support.lock_engaged`, `plan.limit_changed` — the constant's own value,
 * straight onto a screen a non-engineer reads. It is the exact "dev talk"
 * problem the tracker rebuild was about, and it was in three places at once:
 * the overview's last-actions rail, the tenant activity timeline and the
 * platform audit page.
 *
 * ⚠ THE ICON IS PART OF THE VOCABULARY, NOT DECORATION ADDED AFTERWARDS.
 *
 * Thirty-six actions is far too many to tell apart by reading, and a timeline
 * where every row carries the same grey dot is a list nobody scans — which is
 * the whole job of a log. The icons are chosen so the SHAPE answers the first
 * question before the words are read: a door for entering and leaving a
 * workspace, a padlock for the security boundary, a person for membership, a
 * card for money, a robot for the rules. Two actions that are opposites get
 * mirrored glyphs (`IconDoorEnter`/`IconDoorExit`,
 * `IconPlayerPause`/`IconPlayerPlay`, `IconLock`/`IconLockOpen`), so a reader
 * scanning a column sees the reversal rather than reading for it.
 *
 * ⚠ TONE IS NOT SEVERITY. `danger` here means "this took something away" —
 * a suspension, a revocation, a lock. It is not an error, and nothing on these
 * screens is: every row in this table is a thing that succeeded. Colouring a
 * successful suspension red would be wrong; colouring it the same as a logo
 * upload would be worse.
 */

export type AuditTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type AuditDescription = {
  /** Sentence case, no full stop. It sits in a row, not in prose. */
  label: string;
  icon: TablerIcon;
  tone: AuditTone;
};

const VOCABULARY: Record<string, AuditDescription> = {
  /* ── Workspaces ──────────────────────────────────────────────────────── */
  'tenant.provisioned': { label: 'Workspace created', icon: IconBuildingPlus, tone: 'success' },
  'tenant.provisioning_checked': {
    label: 'Workspace setup checked',
    icon: IconEye,
    tone: 'neutral',
  },
  'tenant.self_registered': {
    label: 'Workspace signed itself up',
    icon: IconBuildingPlus,
    tone: 'success',
  },
  'tenant.suspended': { label: 'Workspace suspended', icon: IconPlayerPause, tone: 'danger' },
  'tenant.reactivated': { label: 'Workspace reactivated', icon: IconPlayerPlay, tone: 'success' },
  'tenant.settings_updated': {
    label: 'Workspace settings changed',
    icon: IconPencil,
    tone: 'neutral',
  },
  'tenant.logo_uploaded': { label: 'Workspace logo replaced', icon: IconPhoto, tone: 'neutral' },
  'tenant.ownership_transferred': {
    label: 'Ownership transferred',
    icon: IconTransfer,
    tone: 'warning',
  },

  /* ── Support sessions. The boundary the whole product is sold on. ────── */
  'support.entered': { label: 'Entered a workspace', icon: IconDoorEnter, tone: 'warning' },
  'support.exited': { label: 'Left a workspace', icon: IconDoorExit, tone: 'neutral' },
  'support.extended': { label: 'Support session extended', icon: IconDoorEnter, tone: 'warning' },
  'support.session_read': { label: 'Support record read', icon: IconEye, tone: 'neutral' },
  'support.expired': { label: 'Support visit timed out', icon: IconDoorExit, tone: 'neutral' },
  /* The accent on the register, and here the warning: the customer chose to
     stop a visit, which is the one ending that tells us something. */
  'support.ended_by_customer': {
    label: 'Customer ended a support visit',
    icon: IconDoorExit,
    tone: 'warning',
  },
  'support.entry_refused': { label: 'Support entry refused', icon: IconLock, tone: 'danger' },
  'support.lock_engaged': { label: 'Support locked platform-wide', icon: IconLock, tone: 'danger' },
  'support.lock_released': { label: 'Support unlocked', icon: IconLockOpen, tone: 'success' },
  /* Reaches every workspace's customers, so not neutral. */
  'platform.settings_updated': {
    label: 'Platform settings changed',
    icon: IconPencil,
    tone: 'warning',
  },
  'customer_record.read': { label: 'Customer record read', icon: IconEye, tone: 'warning' },

  /* ── People ──────────────────────────────────────────────────────────── */
  'member.invited': { label: 'Member invited', icon: IconUserPlus, tone: 'info' },
  'member.joined': { label: 'Member joined', icon: IconUserCheck, tone: 'success' },
  'member.role_changed': { label: 'Member role changed', icon: IconUserShield, tone: 'warning' },
  'member.removed': { label: 'Member removed', icon: IconUserMinus, tone: 'danger' },
  'invitation.resent': { label: 'Invitation resent', icon: IconMail, tone: 'neutral' },
  'invitation.revoked': { label: 'Invitation revoked', icon: IconTrash, tone: 'danger' },

  /* ── The operator's own account ──────────────────────────────────────── */
  'profile.updated': { label: 'Profile updated', icon: IconPencil, tone: 'neutral' },
  'password.changed': { label: 'Password changed', icon: IconKey, tone: 'warning' },
  'password.reset': { label: 'Password recovered', icon: IconKey, tone: 'warning' },
  'password.set': { label: 'Account password set', icon: IconKey, tone: 'neutral' },
  'session.revoked': { label: 'Device signed out', icon: IconShieldLock, tone: 'warning' },

  /* ── Money ───────────────────────────────────────────────────────────── */
  'subscription.plan_assigned': { label: 'Plan changed', icon: IconCreditCard, tone: 'info' },
  'subscription.status_changed': {
    label: 'Subscription status changed',
    icon: IconCreditCard,
    tone: 'warning',
  },
  'subscription.override_granted': {
    label: 'Limit override granted',
    icon: IconCreditCard,
    tone: 'info',
  },
  'subscription.contract_set': {
    label: 'Contract price set',
    icon: IconCreditCard,
    tone: 'info',
  },
  'plan.limit_changed': { label: 'Plan limit changed', icon: IconCreditCard, tone: 'warning' },

  /* ── The rules every workspace inherits ──────────────────────────────── */
  'rules.drafted': { label: 'AI rules drafted', icon: IconRobot, tone: 'neutral' },
  'rules.published': { label: 'AI rules published', icon: IconRobot, tone: 'warning' },
  'rules.rolled_back': { label: 'AI rules rolled back', icon: IconArrowBackUp, tone: 'warning' },

  /* ── Credentials ─────────────────────────────────────────────────────── */
  'credential.created': { label: 'API key created', icon: IconKey, tone: 'info' },
  'credential.rotated': { label: 'API key rotated', icon: IconKey, tone: 'warning' },
  'credential.revoked': { label: 'API key revoked', icon: IconKey, tone: 'danger' },

  /* ── Data leaving the platform ───────────────────────────────────────── */
  'audit.exported': { label: 'Audit log exported', icon: IconDownload, tone: 'warning' },
  'platform.exported': { label: 'Platform data exported', icon: IconDownload, tone: 'warning' },

  /* ── Reads, audited because they bypass row-level security ───────────── */
  'watchlist.read': { label: 'Watchlist read', icon: IconEye, tone: 'neutral' },
  'subscription.plan_change_previewed': {
    label: 'Plan change previewed',
    icon: IconEye,
    tone: 'neutral',
  },
};

/* ── Changes and reads ────────────────────────────────────────────────── */

/**
 * Whether an entry records something that CHANGED, or something that was READ.
 *
 * ⚠ THE LEDGER HOLDS BOTH, AND FOR A LONG TIME IT DID NOT SAY WHICH.
 *
 * Every service-role call is audited (06 §7), and some service-role calls are
 * reads: the watchlist sweeps every tenant's usage, a plan preview reads a
 * tenant it is not scoped to, a support session's record is read on each page
 * load. Those belong in the log — a bypass nobody can see is the thing the log
 * exists to prevent — but they are not changes, and a ledger that cannot tell
 * the two apart reads as a platform in constant motion. When doc 23 counted,
 * 287 of 297 entries in the window were a single read recorded as a change.
 */
export type AuditNature = 'change' | 'read';

export const READ_ACTIONS: readonly string[] = [
  'support.session_read',
  'watchlist.read',
  'tenant.provisioning_checked',
  'subscription.plan_change_previewed',
  'customer_record.read',
];

/**
 * Rows written under a CHANGE verb that were in fact reads.
 *
 * ⚠ RECOGNISED, NEVER REWRITTEN. The table is append-only by policy — no update
 * and no delete, for anyone — and a correction that edited history would be
 * the one thing this log must never do. These two shapes are exact: nothing
 * else was ever written with `entity_type = 'watchlist'`, and the preview's
 * reason string was fixed text. Everything written from 30 Sep 2026 uses the
 * read verbs above, and these patterns stop growing.
 *
 * Exported for the volume query, which must classify the same rows the same
 * way in SQL — see `getLiveAuditVolume`.
 */
export const LEGACY_READS = {
  watchlist: { action: 'subscription.status_changed', entityType: 'watchlist' },
  preview: { action: 'subscription.plan_assigned', reason: 'preview only, no change written' },
} as const;

type EntryShape = { action: string; entityType?: string | null; reason?: string | null };

function legacyReadOf(row: EntryShape): string | null {
  if (
    row.action === LEGACY_READS.watchlist.action &&
    row.entityType === LEGACY_READS.watchlist.entityType
  )
    return 'watchlist.read';
  if (row.action === LEGACY_READS.preview.action && row.reason === LEGACY_READS.preview.reason)
    return 'subscription.plan_change_previewed';
  return null;
}

export function natureOf(row: EntryShape): AuditNature {
  return READ_ACTIONS.includes(row.action) || legacyReadOf(row) ? 'read' : 'change';
}

/**
 * The sentence, glyph and tone for one ROW — the action, read in the light of
 * what else the row says. Prefer this to `describeAction` wherever the whole
 * row is to hand; it is the only one that can see through a mislabelled read.
 */
export function describeEntry(row: EntryShape): AuditDescription & {
  nature: AuditNature;
  /** Set when the row was written under the wrong verb. Shown, not hidden. */
  relabelled: string | null;
} {
  const legacy = legacyReadOf(row);
  const effective = legacy ?? row.action;
  return {
    ...describeAction(effective),
    nature: natureOf(row),
    relabelled: legacy ? `Recorded as ${row.action} before 30 Sep 2026` : null,
  };
}

/**
 * An actor label, split into what a person reads.
 *
 * ⚠ LABELS ARE WRITTEN AS `Name <email>` AND WERE RENDERED WHOLE. Initials
 * came out as "K<" from "Kamau <kamau@…>", and the operator column carried the
 * address at full length beside every row. The name is what a reader scans;
 * the address is what they confirm, on the expanded row.
 */
export function parseActor(label: string): {
  name: string;
  email: string | null;
  initials: string;
} {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(label);
  const name = ((m ? m[1] : label) ?? '').trim() || (m?.[2] ?? label);
  const email = m ? (m[2] ?? null) : label.includes('@') ? label : null;
  const words = name
    .replace(/@.*$/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0]?.[0] ?? ''}${words[words.length - 1]?.[0] ?? ''}`
      : (words[0] ?? '?').slice(0, 2);
  return { name, email, initials: initials.toUpperCase() };
}

/**
 * ⚠ AN UNKNOWN ACTION FALLS BACK TO SOMETHING READABLE RATHER THAN TO THE RAW
 *   STRING, and it is not an error state.
 *
 * The log is append-only and holds rows written by versions of this code that
 * no longer exist. An action retired next year is still in the table, and a
 * timeline that renders it as `▮ tenant.frobnicated` tells a reader the SCREEN
 * is broken rather than that the action is old. Turning the dotted string into
 * a sentence — "tenant · frobnicated" — degrades to something a person can
 * still act on.
 */
export function describeAction(action: string): AuditDescription {
  const known = VOCABULARY[action];
  if (known) return known;

  const [domain, ...rest] = action.split('.');
  const verb = rest.join('.').replace(/_/g, ' ');
  return {
    label: verb ? `${domain} · ${verb}` : action,
    icon: IconAlertTriangle,
    tone: 'neutral',
  };
}

/**
 * The tone's two colours: the ink for the glyph, and the ground behind it.
 *
 * ⚠ TOKENS, NOT LITERALS, AND THE BADGE TIER RATHER THAN THE RAW STATUS INKS.
 * 03 §2: a raw hex in a component file is a defect, and the `--badge-*` pairs
 * exist precisely so a tinted glyph on a light ground does not have to be
 * mixed by hand at every call site.
 */
export const AUDIT_TONE: Record<AuditTone, { ink: string; bg: string; edge: string }> = {
  neutral: {
    ink: 'var(--text-secondary)',
    bg: 'var(--surface-inset)',
    edge: 'var(--border-subtle)',
  },
  info: { ink: 'var(--blue-600)', bg: 'var(--blue-50)', edge: 'var(--blue-200)' },
  success: {
    ink: 'var(--success-fg)',
    bg: 'var(--badge-success-bg)',
    edge: 'var(--badge-success-edge)',
  },
  warning: {
    ink: 'var(--warning-fg)',
    bg: 'var(--badge-warning-bg)',
    edge: 'var(--badge-warning-edge)',
  },
  danger: {
    ink: 'var(--danger-fg)',
    bg: 'var(--badge-danger-bg)',
    edge: 'var(--badge-danger-edge)',
  },
};

/**
 * What an entry touched, in words, when there is no workspace name to show.
 *
 * ⚠ THE ROW USED TO FALL BACK TO THE RAW ENTITY TYPE — `user_profile`,
 * `master_ai_rules`, `tenant` — a table name set in the one line a reader uses
 * to tell rows apart. Known types get a noun; anything newer degrades to the
 * snake-case turned into words, for the same reason `describeAction` does.
 */
const TARGETS: Record<string, string> = {
  tenant_member: 'Team membership',
  invitation: 'Team invitation',
  api_credential: 'API credential',
  tenant_settings: 'Company settings',
  tenant_ai_rules: 'Workspace rules',
  tenant: 'A workspace',
  user_profile: 'An operator profile',
  subscription: 'A subscription',
  session: 'A sign-in session',
  support_session: 'A support session',
  master_ai_rules: 'The master AI rules',
  watchlist: 'The watchlist',
  export: 'A data export',
  report: 'A report',
  plan_entitlement: 'A plan limit',
  platform_settings: 'Platform settings',
};

export function describeTarget(entityType: string | undefined | null): string {
  if (!entityType) return 'The platform';
  const known = TARGETS[entityType];
  if (known) return known;
  const words = entityType.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
