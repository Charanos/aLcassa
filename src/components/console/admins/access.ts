import type { Admin } from '@/lib/console/data';

/**
 * The platform's access model, stated once for every place that draws it.
 *
 * ⚠ THREE ROWS ARE ENFORCED AND THEY SAY WHERE. Since doc 23 each of these is
 * checked by `requireCapability` inside the service transaction of every call
 * it governs, and each row names the column it reads — so a reader can check
 * the claim against the schema rather than trust the page.
 *
 * ⚠ THE OTHER ROWS ARE STATEMENTS ABOUT THE ARCHITECTURE, and they say why
 * rather than just drawing a dash. "Nobody can read a customer's message" is
 * the strongest line on this page, and a dash in a table does not tell a
 * security reviewer whether that is a permission nobody happens to hold or a
 * thing the system cannot do. It is the second, and the row says so.
 */

export type CapabilityKey = keyof Admin['capabilities'];

export const ENFORCED: ReadonlyArray<{
  key: CapabilityKey;
  label: string;
  short: string;
  detail: string;
  column: string;
}> = [
  {
    key: 'manageWorkspaces',
    label: 'Manage workspaces',
    short: 'Workspaces',
    detail: 'Provision, suspend, reactivate, re-plan, grant overrides, move plan limits.',
    column: 'can_suspend_tenants',
  },
  {
    key: 'editMasterRules',
    label: 'Edit the master AI rules',
    short: 'Master rules',
    detail: 'Publish and roll back the rules every workspace inherits.',
    column: 'can_edit_master_rules',
  },
  {
    key: 'enterSupportMode',
    label: 'Open support sessions',
    short: 'Support',
    detail: "Enter a customer's workspace for thirty minutes, logged to their own activity.",
    column: 'can_enter_support_mode',
  },
];

export const BY_CONSTRUCTION: ReadonlyArray<{
  label: string;
  everyone: boolean;
  why: string;
}> = [
  {
    label: 'See every workspace and its usage',
    everyone: true,
    why: 'By being on this list. It is what the list is.',
  },
  {
    label: 'Grant or revoke platform access',
    everyone: false,
    why: 'Not possible from the console. Done in the database today, and not yet recorded in the audit log.',
  },
  {
    label: "Read a customer's message",
    everyone: false,
    why: 'Message bodies are never selected into any console read.',
  },
  {
    label: 'Read an API key',
    everyone: false,
    why: 'Keys are stored as argon2id hashes and shown once, at creation.',
  },
];

/** "Full access", "Support only", "No capabilities", or "Partial". */
export function accessLabel(caps: Admin['capabilities']): {
  label: string;
  tone: 'brand' | 'neutral' | 'warning';
} {
  const held = ENFORCED.filter((c) => caps[c.key]).length;
  if (held === ENFORCED.length) return { label: 'Full access', tone: 'brand' };
  if (held === 0) return { label: 'No capabilities', tone: 'warning' };
  if (held === 1 && caps.enterSupportMode) return { label: 'Support only', tone: 'neutral' };
  return { label: 'Partial access', tone: 'neutral' };
}
