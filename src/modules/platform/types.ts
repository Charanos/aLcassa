import { z } from 'zod';

/**
 * 02 §3 · 05 §3 · 11 §6. Provisioning input.
 *
 * ⚠ THE SLUG IS VALIDATED HERE AND UNIQUE IN THE DATABASE, AND BOTH ARE
 * NEEDED. This schema rejects the shapes a slug must never take; the unique
 * index rejects the one it cannot know about, which is whether someone else
 * took it a millisecond ago. Validation is not a substitute for a constraint
 * and a constraint is not a substitute for a good error message.
 *
 * The slug is display and a future custom subdomain. It is NOT how a tenant
 * is addressed in a URL — 02 §9 fixes that as a UUID, "never a slug and
 * never sequential, because a guessable tenant URL is an invitation to
 * probe."
 */
export const slugSchema = z
  .string()
  .min(3, 'At least three characters.')
  .max(48, 'At most forty-eight characters.')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Lowercase letters, numbers and single hyphens between them.',
  )
  /**
   * A slug becomes a subdomain later. These are the labels that break or
   * mislead when it does: `www` and `api` collide with real hosts, `admin`
   * and `platform` impersonate this product's own surfaces, and the rest are
   * routes that already exist. Rejecting them at provisioning costs nothing;
   * discovering the collision after a customer has printed it costs a
   * migration and an apology.
   */
  .refine((value) => !RESERVED_SLUGS.has(value), 'That name is reserved.');

export const RESERVED_SLUGS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'platform',
  'auth',
  'sign-in',
  'sign-up',
  'invite',
  'status',
  'docs',
  'support',
  'help',
  'billing',
  'legal',
  'mail',
  'smtp',
  'ftp',
  'test',
  'staging',
]);

export const provisionTenantSchema = z.object({
  /** The business's legal or trading name. Shown everywhere. */
  name: z.string().min(1, 'A name is required.').max(120),
  slug: slugSchema,
  /** The first owner. They receive an invitation and set their own password;
   *  nobody here ever sees it. 02 §3. */
  ownerEmail: z.string().email('Enter a valid email address.'),
  ownerName: z.string().min(1, 'A name is required.').max(120),
  /** `trial` is the entry state — 01 D-13 confirmed there is no free plan. */
  initialStatus: z.enum(['trial', 'active']).default('trial'),
});

export type ProvisionTenantInput = z.infer<typeof provisionTenantSchema>;

export type ProvisionTenantResult =
  | { ok: true; tenantId: string; slug: string; ownerUserId: string }
  | {
      ok: false;
      code: 'slug_taken' | 'owner_exists' | 'validation_failed' | 'provisioning_failed';
      message: string;
      details?: Array<{ field: string; message: string }>;
    };
