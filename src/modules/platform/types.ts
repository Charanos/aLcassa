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
  /**
   * The plan the workspace starts on, by `plans.code`.
   *
   * ⚠ THIS FIELD DID NOT EXIST, AND ITS ABSENCE IS WHY PROVISIONING NEVER
   *   WORKED. The modal asked the operator to choose a plan, the action
   *   dropped it on the floor, and `provisionTenant` inserted a tenant, its
   *   settings, the owner profile and the membership — and no subscription
   *   row. A workspace came out of it with no plan, therefore no entitlements,
   *   therefore no seat ceiling, showing "—" on every plan column in the
   *   console.
   *
   * The modal was promising otherwise in writing, in step 2 of its own list:
   * "Plan entitlements resolved and snapshotted onto the workspace." Nothing
   * resolved anything.
   *
   * It is a CODE rather than an id because that is what the operator's screen
   * knows and what the seed, the fixtures and `portfolio.ts` all speak. The
   * service resolves it to a row and refuses if there is no match, which is
   * also the check that would have caught `growth`.
   */
  planCode: z.string().min(1, 'Choose a plan.'),
});

export type ProvisionTenantInput = z.infer<typeof provisionTenantSchema>;

export type ProvisionTenantResult =
  | { ok: true; tenantId: string; slug: string; ownerUserId: string }
  | {
      ok: false;
      code:
        | 'slug_taken'
        | 'owner_exists'
        | 'unknown_plan'
        | 'validation_failed'
        | 'provisioning_failed';
      message: string;
      details?: Array<{ field: string; message: string }>;
    };
