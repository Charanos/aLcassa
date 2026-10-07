import 'server-only';
import { and, eq } from 'drizzle-orm';
import { tenantSettings, tenants } from '@/db/schema';
import { AUDIT_ACTIONS, audited } from '@/lib/audit';
import { withTenantContext, type ResolvedContext } from '@/lib/db';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { companyInput } from './companyInput';

/** The display name is a setting; changing the platform workspace identity is separate. */
export async function saveCompanySettings(
  ctx: ResolvedContext,
  input: unknown,
): Promise<{ version: number }> {
  if (!['owner', 'admin', 'support'].includes(ctx.role))
    throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
  const parsed = companyInput.safeParse(input);
  if (!parsed.success)
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, { message: parsed.error.issues[0]?.message });
  const values = parsed.data;
  return withTenantContext(ctx, async (tx) => {
    const [tenant] = await tx
      .select({ status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);
    if (!tenant) throw new AppError(ERROR_CODES.TENANT_NOT_FOUND);
    if (
      tenant.status === 'suspended' ||
      tenant.status === 'closed' ||
      tenant.status === 'provisioning'
    )
      throw new AppError(ERROR_CODES.TENANT_SUSPENDED);
    // RLS supplies the tenant boundary. The version supplies concurrency control.
    const [before] = await tx.select().from(tenantSettings).limit(1);
    if ((before?.version ?? 0) !== values.version)
      throw new AppError(ERROR_CODES.TENANT_SETTINGS_CONFLICT);
    const id = before?.id ?? crypto.randomUUID();
    const after = {
      displayName: values.name,
      supportEmail: values.contactEmail,
      timezone: values.timezone,
      locale: values.locale,
      version: values.version + 1,
    };
    return audited(
      tx,
      ctx,
      {
        action: AUDIT_ACTIONS.TENANT_SETTINGS_UPDATED,
        entityType: 'tenant_settings',
        entityId: id,
        before: before
          ? {
              displayName: before.displayName,
              supportEmail: before.supportEmail,
              timezone: before.timezone,
              locale: before.locale,
              version: before.version,
            }
          : null,
        after,
      },
      async () => {
        const rows = before
          ? await tx
              .update(tenantSettings)
              .set({ ...after, updatedAt: new Date() })
              .where(and(eq(tenantSettings.id, id), eq(tenantSettings.version, values.version)))
              .returning({ version: tenantSettings.version })
          : await tx
              .insert(tenantSettings)
              .values({ id, tenantId: ctx.tenantId, ...after })
              .onConflictDoNothing({ target: tenantSettings.tenantId })
              .returning({ version: tenantSettings.version });
        if (!rows[0]) throw new AppError(ERROR_CODES.TENANT_SETTINGS_CONFLICT);
        return rows[0];
      },
    );
  });
}
