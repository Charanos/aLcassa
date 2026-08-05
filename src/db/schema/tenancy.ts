import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { pk, softDelete, timestamps, version } from './_shared';

/** 08 §7. Every transition in Phase 1 is a platform action with an audit entry
 *  naming who made it and why. Nothing moves a tenant automatically. */
export const tenantStatus = pgEnum('tenant_status', [
  'provisioning',
  'trial',
  'active',
  'past_due',
  'suspended',
  'closed',
]);

/**
 * 05 §3. `tenants` is the one table that is not itself tenant-scoped in the
 * usual sense, so its policy is written by hand rather than generated from the
 * standard shape: a tenant user selects their own row, resolved through
 * membership, and platform admins select all through the platform path.
 */
export const tenants = pgTable(
  'tenants',
  {
    id: pk(),
    // Display, and a future custom subdomain. NOT used for routing in Phase 1:
    // a tenant identifier in a URL is a UUID, never a slug and never sequential,
    // because a guessable tenant URL is an invitation to probe. 02 §9.
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    status: tenantStatus('status').notNull().default('provisioning'),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspendedReason: text('suspended_reason'),
    suspendedBy: uuid('suspended_by'),
    provisionedAt: timestamp('provisioned_at', { withTimezone: true }),
    version,
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('tenants_status_idx').on(t.status),
    uniqueIndex('tenants_slug_idx').on(t.slug),
  ],
);

export const tenantSettings = pgTable(
  'tenant_settings',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .unique()
      .references(() => tenants.id, { onDelete: 'restrict' }), // one row per tenant, enforced
    displayName: text('display_name'),
    logoPath: text('logo_path'), // Supabase Storage, tenant-scoped bucket path
    supportEmail: text('support_email'),
    websiteUrl: text('website_url'),
    timezone: text('timezone').notNull().default('Africa/Nairobi'),
    locale: text('locale').notNull().default('en'),
    brandColor: text('brand_color'), // reserved for Phase 2 widget theming
    version,
    ...timestamps,
  },
  (t) => [index('tenant_settings_tenant_idx').on(t.tenantId)],
);

export type Tenant = typeof tenants.$inferSelect;
export type TenantSettings = typeof tenantSettings.$inferSelect;
