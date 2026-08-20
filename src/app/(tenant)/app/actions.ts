'use server';

/**
 * Tenant application server actions.
 *
 * ⚠ EVERY ONE OF THESE VALIDATES EVERYTHING IT CAN AND WRITES NOTHING, ON
 * PURPOSE — the exact discipline `suspendWorkspace` established on the
 * platform side (`src/app/(platform)/platform/(console)/actions.ts`), and for
 * the same reason. `src/lib/tenant/data.ts` is a read-model seam over
 * fixtures, not a live table, so there is nothing yet for any of these to
 * write to. A button with no handler behind it looks like it might have
 * worked; a handler that checks real input and refuses with the specific,
 * named reason does not. Every action below returns `{ ok: false, error }`
 * with a reason naming exactly which table or module is still pending,
 * rather than silently succeeding against nothing.
 *
 * When the tenant mutation layer lands, each of these becomes a real write —
 * the validation, the shape and the call sites in the pages below do not
 * change.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function updateCompany(input: {
  name: string;
  contactEmail: string;
  timezone: string;
  locale: string;
}): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: 'Company name is required.' };
  if (!/.+@.+\..+/.test(input.contactEmail)) return { ok: false, error: 'Enter a valid contact email.' };

  return {
    ok: false,
    error: 'Company settings write to tenant_settings, which is not wired until the tenant mutation module lands. The request itself is valid — nothing else is blocking it.',
  };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function sendInvitation(input: { email: string; role: string }): Promise<ActionResult> {
  if (!/.+@.+\..+/.test(input.email)) return { ok: false, error: 'Enter a valid email address.' };
  if (!['owner', 'admin', 'agent'].includes(input.role)) return { ok: false, error: 'Select a role.' };

  return {
    ok: false,
    error: 'Invitations write to the invitations table and send a real email, neither of which exists yet. The request itself is valid — nothing else is blocking it.',
  };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function revokeInvitation(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select an invitation to revoke.' };
  return { ok: false, error: 'Revoking an invitation is not wired until the invitations table lands.' };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function removeMember(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select a member to remove.' };
  return { ok: false, error: 'Removing a member is not wired until the memberships mutation module lands.' };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function createCredential(input: { name: string; scopes: string[] }): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: 'Name the credential so it is recognisable in the list later.' };
  if (input.scopes.length === 0) return { ok: false, error: 'Select at least one scope.' };

  return {
    ok: false,
    error: 'A credential cannot be minted without the api_credentials table — this is the one screen that should never fabricate a secret, so it refuses rather than showing one that is not real.',
  };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function revokeCredential(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select a credential to revoke.' };
  return { ok: false, error: 'Revoking a credential is not wired until the api_credentials table lands.' };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function publishAiRules(input: { changeNote: string }): Promise<ActionResult> {
  if (!input.changeNote.trim()) {
    return { ok: false, error: 'A change note is required — it is what makes the version history readable six months later.' };
  }

  return {
    ok: false,
    error: 'Publishing writes an append-only version row to tenant_ai_rules, which is not wired until M4a. The change note and the edited fields are valid — nothing else is blocking it.',
  };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function updateProfile(input: { name: string }): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: 'Name cannot be empty.' };
  return { ok: false, error: 'Profile updates are not wired until the identity module lands at M2.' };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function revokeSession(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select a session to revoke.' };
  return { ok: false, error: 'Session revocation is not wired until the session-store module lands.' };
}
