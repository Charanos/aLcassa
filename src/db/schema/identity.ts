import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { pk, softDelete, timestamps } from './_shared';
import { tenantRef } from './tenancy';

/**
 * 05 §4. Supabase owns `auth.users`. ADR-002 states the cost of that choice
 * plainly: Supabase has no first-class notion of a tenant with members and
 * roles, so `tenants`, `tenant_members` and the invitation flow are hand-built.
 * That is roughly a week of M1 and M2 and it is already in the plan.
 */

/** Our profile projection over auth.users. */
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  fullName: text('full_name').notNull(),
  /**
   * ⚠ A DELIBERATE DUPLICATE OF auth.users.email, AND THE PROJECTION IS THE
   *   REASON THIS TABLE EXISTS.
   *
   * The address of record lives in Supabase's `auth.users`, which is
   * reachable only through the admin client — and that client is lint-guarded
   * to `src/modules/platform` precisely because it bypasses Row Level
   * Security. So a tenant rendering its own team list could not show who
   * anybody is without either widening that guard or reading every member's
   * identity through an RLS-bypassing path on an ordinary page load. Both are
   * worse than a copied column.
   *
   * It is NOT the source of truth and nothing authenticates against it. It is
   * written when a profile is created and left alone otherwise; if the two
   * ever disagree, `auth.users` is right. Nullable because a profile can
   * exist before its address is known, and because a lie is worse than a gap.
   */
  email: text('email'),
  avatarPath: text('avatar_path'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  ...timestamps,
  ...softDelete,
});

export const memberRole = pgEnum('member_role', ['owner', 'admin', 'agent']);
export const memberStatus = pgEnum('member_status', ['active', 'invited', 'suspended']);

/**
 * 06 §5. A tenant always has exactly one owner. Ownership transfers atomically:
 * the new owner is promoted and the old owner demoted to admin in one
 * transaction. There is no state in which a tenant has zero owners or two, and
 * the last owner cannot be removed or demoted.
 */
export const tenantMembers = pgTable(
  'tenant_members',
  {
    id: pk(),
    tenantId: tenantRef(),
    userId: uuid('user_id').notNull(),
    role: memberRole('role').notNull().default('agent'),
    status: memberStatus('status').notNull().default('active'),
    invitedBy: uuid('invited_by'),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('tenant_members_unique').on(t.tenantId, t.userId),
    index('tenant_members_user_idx').on(t.userId),
    index('tenant_members_tenant_role_idx').on(t.tenantId, t.role),
  ],
);

export const invitations = pgTable(
  'invitations',
  {
    id: pk(),
    tenantId: tenantRef(),
    email: text('email').notNull(),
    role: memberRole('role').notNull().default('agent'),
    // 02 §9. 32 bytes from a CSPRNG, hashed at rest, single use, 7 day expiry.
    tokenHash: text('token_hash').notNull().unique(),
    invitedBy: uuid('invited_by').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    /**
     * 05 §4 · I-15. A PARTIAL unique index, and the partial part is the point:
     * it prevents two live invitations to the same address in one tenant, while
     * still allowing a fresh invitation after one was revoked. A plain unique
     * index would block that entirely legitimate case.
     */
    uniqueIndex('invitations_pending_unique')
      .on(t.tenantId, t.email)
      .where(sql`accepted_at is null and revoked_at is null`),
    index('invitations_expiry_idx').on(t.expiresAt),
  ],
);

export type SupportContext = {
  platformAdminId: string;
  reason?: string;
  enteredAt: string;
};

/**
 * 04 §6. Sessions are rows, so revocation is real and immediate rather than a
 * wait for a token to expire. A support session is an ordinary row here with
 * `kind = 'support'`, which is exactly what makes its ceiling genuine: RLS
 * reads `tenant_id` and `role` from it the same way it does for any tenant
 * user. 06 §6.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: pk(),
    userId: uuid('user_id').notNull(),
    kind: text('kind').notNull(), // tenant | platform | support
    tenantId: uuid('tenant_id'), // null for a platform session
    effectiveRole: text('effective_role'), // 'support' for a support session
    supportContext: jsonb('support_context').$type<SupportContext | null>(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason'),
    ...timestamps,
  },
  (t) => [
    index('sessions_user_idx').on(t.userId, t.revokedAt),
    index('sessions_expiry_idx').on(t.expiresAt),
    index('sessions_tenant_idx').on(t.tenantId, t.kind),
  ],
);

/**
 * 05 §4 · 09 §6. Per-capability booleans rather than a role enum, which answers
 * 01 §9 question 6 in the cheapest way that survives Brian adding a second
 * admin later. A role enum would need a migration and a permission table; three
 * booleans need neither.
 */
export const platformAdmins = pgTable('platform_admins', {
  id: pk(),
  userId: uuid('user_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  canSuspendTenants: boolean('can_suspend_tenants').notNull().default(true),
  canEditMasterRules: boolean('can_edit_master_rules').notNull().default(true),
  canEnterSupportMode: boolean('can_enter_support_mode').notNull().default(true),
  ...timestamps,
  ...softDelete,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type TenantMember = typeof tenantMembers.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type MemberRole = (typeof memberRole.enumValues)[number];
export type MemberStatus = (typeof memberStatus.enumValues)[number];
