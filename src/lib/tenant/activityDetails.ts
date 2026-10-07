export type ActivityChange = { label: string; before: string; after: string };

const FIELDS: Record<string, Array<[string, string]>> = {
  'subscription.plan_assigned': [
    ['plan', 'Plan'],
    ['monthly', 'Monthly contract value'],
  ],
  'subscription.contract_set': [['monthly', 'Monthly contract value']],
  'subscription.status_changed': [['status', 'Subscription status']],
  'subscription.override_granted': [
    ['key', 'Allowance'],
    ['limitValue', 'Override allowance'],
    ['expiresAt', 'Expiry'],
  ],
  'plan.limit_changed': [
    ['key', 'Allowance'],
    ['planLimit', 'Plan allowance'],
    ['effectiveLimit', 'Workspace allowance'],
  ],
  'tenant.settings_updated': [
    ['name', 'Workspace name'],
    ['displayName', 'Workspace name'],
    ['contactEmail', 'Contact email'],
    ['timezone', 'Timezone'],
    ['locale', 'Language and region'],
  ],
  'member.role_changed': [['role', 'Role']],
  'rules.published': [['versionNumber', 'Version']],
  'rules.rolled_back': [['versionNumber', 'Version']],
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function display(value: unknown, field: string): string {
  if (value === undefined) return 'Not recorded';
  if (value === null)
    return ['limitValue', 'planLimit', 'effectiveLimit'].includes(field)
      ? 'Unlimited'
      : 'Not recorded';
  if (field === 'monthly' && typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')
    return 'Not recorded';
  const text = String(value).slice(0, 500);
  return ['plan', 'status', 'role', 'key'].includes(field)
    ? text.replace(/[_-]/g, ' ').replace(/^./, (initial) => initial.toUpperCase())
    : text;
}

/** Whitelist human-readable changes; never serialize arbitrary audit payloads into a response. */
export function activityDetails(
  action: string,
  beforeValue: unknown,
  afterValue: unknown,
): { changes: ActivityChange[]; reason?: string } {
  const before = record(beforeValue);
  const after = record(afterValue);
  const changes = (FIELDS[action] ?? []).flatMap(([field, label]) => {
    if (!(field in before) && !(field in after)) return [];
    if (before[field] === after[field]) return [];
    return [{ label, before: display(before[field], field), after: display(after[field], field) }];
  });
  const reasonAllowed =
    Boolean(FIELDS[action]) ||
    action.startsWith('support.') ||
    ['tenant.suspended', 'tenant.reactivated'].includes(action);
  const reason =
    reasonAllowed && typeof after.reason === 'string'
      ? after.reason.trim().slice(0, 2000)
      : undefined;
  return { changes, ...(reason ? { reason } : {}) };
}
