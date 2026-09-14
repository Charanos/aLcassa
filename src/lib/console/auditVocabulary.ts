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
  'tenant.self_registered': { label: 'Workspace signed itself up', icon: IconBuildingPlus, tone: 'success' },
  'tenant.suspended': { label: 'Workspace suspended', icon: IconPlayerPause, tone: 'danger' },
  'tenant.reactivated': { label: 'Workspace reactivated', icon: IconPlayerPlay, tone: 'success' },
  'tenant.settings_updated': { label: 'Workspace settings changed', icon: IconPencil, tone: 'neutral' },
  'tenant.logo_uploaded': { label: 'Workspace logo replaced', icon: IconPhoto, tone: 'neutral' },
  'tenant.ownership_transferred': { label: 'Ownership transferred', icon: IconTransfer, tone: 'warning' },

  /* ── Support sessions. The boundary the whole product is sold on. ────── */
  'support.entered': { label: 'Entered a workspace', icon: IconDoorEnter, tone: 'warning' },
  'support.exited': { label: 'Left a workspace', icon: IconDoorExit, tone: 'neutral' },
  'support.extended': { label: 'Support session extended', icon: IconDoorEnter, tone: 'warning' },
  'support.session_read': { label: 'Support record read', icon: IconEye, tone: 'neutral' },
  'support.lock_engaged': { label: 'Support locked platform-wide', icon: IconLock, tone: 'danger' },
  'support.lock_released': { label: 'Support unlocked', icon: IconLockOpen, tone: 'success' },
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
  'session.revoked': { label: 'Device signed out', icon: IconShieldLock, tone: 'warning' },

  /* ── Money ───────────────────────────────────────────────────────────── */
  'subscription.plan_assigned': { label: 'Plan changed', icon: IconCreditCard, tone: 'info' },
  'subscription.status_changed': { label: 'Subscription status changed', icon: IconCreditCard, tone: 'warning' },
  'subscription.override_granted': { label: 'Limit override granted', icon: IconCreditCard, tone: 'info' },
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
};

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
