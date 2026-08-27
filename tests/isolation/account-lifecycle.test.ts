import { afterAll, describe, expect, it } from 'vitest';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { asActor, cleanup, closeHarness, withNoContext, type Actor } from './harness';
import {
  SEED_TENANT_A,
  SEED_TENANT_B,
  SEED_USER_A,
  SEED_USER_B,
} from '../../src/db/seed/constants';

/**
 * 07 §3 · 07 §5. THE M2 ACCOUNT LIFECYCLE, AGAINST THE REAL DATABASE.
 *
 * ⚠ THIS FILE EXISTS BECAUSE THE ACCEPT FLOW SHIPPED BROKEN AND TYPECHECKED
 *   PERFECTLY.
 *
 * `acceptInvitation` originally wrote to `invitations` and `tenant_members`
 * through Drizzle under a context with no tenant — the only context available
 * before the membership it creates exists. Every policy on both tables
 * compares against a null tenant, so the writes matched nothing. The route
 * returned 200, set a session cookie, and redirected the new member into a
 * workspace they had not joined.
 *
 * Nothing in TypeScript could have caught it: the query was valid, the types
 * were right, and zero rows updated is not an error. Only running it against
 * a database with the policies applied shows it, which is what these cases do.
 *
 * They are in the isolation directory rather than a unit test directory
 * deliberately. Every one of them is a statement about what a policy permits,
 * and they must run wherever the isolation suite runs — CI, with no override.
 */

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

const asOwnerA: Actor = {
  tenantId: SEED_TENANT_A,
  role: 'owner',
  actorId: SEED_USER_A,
  supportMode: false,
};

const asOwnerB: Actor = {
  tenantId: SEED_TENANT_B,
  role: 'owner',
  actorId: SEED_USER_B,
  supportMode: false,
};

/**
 * Everything each case creates, removed afterwards.
 *
 * ⚠ THROUGH `cleanup`, WHICH BYPASSES RLS, AND THE FIRST VERSION DID NOT.
 *
 * Deleting through the RLS-bound connection with no context set removes
 * nothing — every policy matches a null tenant, and zero rows deleted is not
 * an error, so the teardown reported success while the fixtures piled up.
 * They then broke eight cases in the generated suite, which counts rows in
 * `sessions` and `user_profiles` and had no idea where the extras came from.
 *
 * Teardown is one of the few places that legitimately needs to see past the
 * policies, and it says so.
 */
const created = { invitations: [] as string[], users: [] as string[], sessions: [] as string[] };

/**
 * ⚠ FIVE STATEMENTS, NOT ONE PER ROW.
 *
 * The database is remote — a Supabase pooler over the network — so every
 * round trip costs a second or more. Deleting row by row meant roughly
 * twenty-five of them and the hook timed out at ten seconds, which fails the
 * whole FILE while every case in it passes. That is a confusing way to
 * discover a slow teardown.
 *
 * `= any()` sends each set as one array parameter, so the whole teardown is
 * five trips regardless of how many fixtures the run created. The timeout is
 * raised as well, because a slow network should make this slow rather than
 * red.
 */
afterAll(async () => {
  if (created.users.length > 0) {
    // ⚠ THE AUDIT ROWS TOO. `app.accept_invitation` writes a member.joined
    // entry, and the first version of this teardown did not know that —
    // because the audit row was added after the teardown was written. The
    // residue then showed up on the tenant's own activity screen when it was
    // wired to live data, which is a confusing way to discover a test leak.
    await cleanup`delete from audit_log where actor_user_id = any(${created.users})`;
    await cleanup`delete from tenant_members where user_id = any(${created.users})`;
    await cleanup`delete from sessions where user_id = any(${created.users})`;
    await cleanup`delete from user_profiles where id = any(${created.users})`;
  }
  if (created.sessions.length > 0) {
    await cleanup`delete from sessions where id = any(${created.sessions})`;
  }
  if (created.invitations.length > 0) {
    await cleanup`delete from invitations where id = any(${created.invitations})`;
  }
  await closeHarness();
}, 60_000);

async function createInvitation(email: string): Promise<{ id: string; token: string }> {
  const token = randomBytes(32).toString('base64url');
  const id = await asActor(asOwnerA, async (tx) => {
    const rows = await tx`
      insert into invitations (tenant_id, email, role, token_hash, invited_by, expires_at)
      values (${SEED_TENANT_A}, ${email}, 'agent', ${hash(token)}, ${SEED_USER_A},
              now() + interval '7 days')
      returning id
    `;
    return rows[0]?.id as string;
  });
  created.invitations.push(id);
  return { id, token };
}

describe('account lifecycle · invitations', () => {
  it('an owner can issue one, and only its hash is stored', async () => {
    const { id, token } = await createInvitation(`hash-${randomUUID()}@example.test`);
    expect(id).toBeTruthy();

    const [row] = await asActor(
      asOwnerA,
      (tx) => tx`select token_hash from invitations where id = ${id}`,
    );
    expect(row?.token_hash).toBe(hash(token));
    // The plaintext token must never be recoverable from the row.
    expect(row?.token_hash).not.toBe(token);
  });

  /**
   * ⚠ THE CASE THAT WOULD HAVE CAUGHT THE BROKEN ACCEPT FLOW.
   *
   * With no context at all — which is what a public accept URL has — the
   * token holder must be able to read their invitation, and nobody else must
   * be able to read anything.
   */
  it('is readable by its token with no session, through the function', async () => {
    const { token } = await createInvitation(`read-${randomUUID()}@example.test`);

    const rows = await withNoContext(
      (tx) => tx`select * from app.invitation_by_token(${hash(token)})`,
    );
    expect(rows.length, 'the accept screen cannot read its own invitation').toBe(1);
    expect(rows[0]?.tenant_name).toBeTruthy();
  });

  it('leaves the table itself closed to an unauthenticated caller', async () => {
    await createInvitation(`closed-${randomUUID()}@example.test`);

    const rows = await withNoContext((tx) => tx`select id from invitations`);
    expect(rows.length, 'every pending invitation on the platform is readable').toBe(0);
  });

  it('returns nothing for a token that does not match', async () => {
    const rows = await withNoContext(
      (tx) => tx`select * from app.invitation_by_token(${hash('not-a-real-token')})`,
    );
    expect(rows.length).toBe(0);
  });

  it('is invisible to another workspace', async () => {
    const { id } = await createInvitation(`cross-${randomUUID()}@example.test`);

    const rows = await asActor(asOwnerB, (tx) => tx`select id from invitations where id = ${id}`);
    expect(rows.length).toBe(0);
  });
});

describe('account lifecycle · acceptance', () => {
  it('creates the membership and marks the token used, atomically', async () => {
    const email = `accept-${randomUUID()}@example.test`;
    const { id, token } = await createInvitation(email);
    const newUserId = randomUUID();
    created.users.push(newUserId);

    const accepted = await withNoContext(
      (tx) => tx`select * from app.accept_invitation(${hash(token)}, ${newUserId},
                                                     'Test Person', ${email})`,
    );

    expect(accepted[0]?.accepted_tenant_id).toBe(SEED_TENANT_A);
    expect(accepted[0]?.accepted_role).toBe('agent');

    // The row must genuinely exist. This is the assertion whose absence let
    // a no-op acceptance report success.
    const [membership] = await asActor(
      asOwnerA,
      (tx) => tx`select role, status from tenant_members where user_id = ${newUserId}`,
    );
    expect(membership, 'acceptance reported success and created nothing').toBeTruthy();
    expect(membership?.role).toBe('agent');

    const [invitation] = await asActor(
      asOwnerA,
      (tx) => tx`select accepted_at from invitations where id = ${id}`,
    );
    expect(invitation?.accepted_at).toBeTruthy();
  });

  /**
   * ⚠ THE JOIN MUST BE AUDITED, AND FOR A WHILE IT WAS NOT.
   *
   * Definition of done condition 3: every write produces an audit entry.
   * Inviting, removing and role changes were all audited; ACCEPTING was not,
   * because the write moved into `app.accept_invitation` when the acceptance
   * flow was repaired and the audit row did not move with it. A workspace's
   * activity log showed an invitation going out and then nothing, and a new
   * person simply appeared in the team list.
   *
   * The row is written inside the same function as the membership, so this
   * case also proves they cannot come apart.
   */
  it('writes a member.joined entry the workspace can read', async () => {
    const email = `joined-${randomUUID()}@example.test`;
    const { token } = await createInvitation(email);
    const newUserId = randomUUID();
    created.users.push(newUserId);

    await withNoContext(
      (tx) => tx`select * from app.accept_invitation(${hash(token)}, ${newUserId},
                                                     'Joined Person', ${email})`,
    );

    // Read as the TENANT: an audit entry they cannot see is not a trail.
    const entries = await asActor(
      asOwnerA,
      (tx) => tx`
        select action, actor_user_id, actor_type, support_mode, after
        from audit_log
        where action = 'member.joined' and actor_user_id = ${newUserId}
      `,
    );

    expect(entries.length, 'accepting an invitation left no trace in the activity log').toBe(1);
    // The person joining is the actor. Nobody did this to them.
    expect(entries[0]?.actor_type).toBe('user');
    expect(entries[0]?.support_mode).toBe(false);
  });

  it('refuses a second use of the same token', async () => {
    const email = `replay-${randomUUID()}@example.test`;
    const { token } = await createInvitation(email);
    const firstUser = randomUUID();
    const secondUser = randomUUID();
    created.users.push(firstUser, secondUser);

    await withNoContext(
      (tx) =>
        tx`select * from app.accept_invitation(${hash(token)}, ${firstUser}, 'First', ${email})`,
    );

    // Catch outside the transaction: Postgres aborts it on the raise, so
    // `sql.begin()` rethrows past any inner catch.
    let message = '';
    try {
      await withNoContext(
        (tx) =>
          tx`select * from app.accept_invitation(${hash(token)}, ${secondUser}, 'Second', ${email})`,
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('already_accepted');

    const rows = await asActor(
      asOwnerA,
      (tx) => tx`select id from tenant_members where user_id = ${secondUser}`,
    );
    expect(rows.length, 'a replayed token created a second membership').toBe(0);
  });

  it('refuses an expired token, and creates nothing', async () => {
    const email = `expired-${randomUUID()}@example.test`;
    const token = randomBytes(32).toString('base64url');
    const userId = randomUUID();
    created.users.push(userId);

    const id = await asActor(asOwnerA, async (tx) => {
      const rows = await tx`
        insert into invitations (tenant_id, email, role, token_hash, invited_by, expires_at)
        values (${SEED_TENANT_A}, ${email}, 'agent', ${hash(token)}, ${SEED_USER_A},
                now() - interval '1 day')
        returning id
      `;
      return rows[0]?.id as string;
    });
    created.invitations.push(id);

    let message = '';
    try {
      await withNoContext(
        (tx) =>
          tx`select * from app.accept_invitation(${hash(token)}, ${userId}, 'Late', ${email})`,
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('expired');

    const rows = await asActor(
      asOwnerA,
      (tx) => tx`select id from tenant_members where user_id = ${userId}`,
    );
    expect(rows.length).toBe(0);
  });
});

describe('account lifecycle · roles and sessions', () => {
  it('an agent cannot change anyone’s role', async () => {
    const asAgent: Actor = { ...asOwnerA, role: 'agent' };

    const ownerMemberId = await asActor(asOwnerA, async (tx) => {
      const rows = await tx<{ id: string }[]>`
        select id from tenant_members
        where tenant_id = ${SEED_TENANT_A} and role = 'owner' limit 1
      `;
      return rows[0]?.id ?? null;
    });
    if (!ownerMemberId) throw new Error('tenant A has no owner: is the database seeded?');

    let affected = -1;
    try {
      affected = await asActor(asAgent, async (tx) => {
        const rows = await tx`update tenant_members set role = 'agent'
                              where id = ${ownerMemberId} returning id`;
        return rows.length;
      });
    } catch {
      affected = 0;
    }
    expect(affected).toBe(0);
  });

  it('a workspace has exactly one owner', async () => {
    const [row] = await asActor(
      asOwnerA,
      (tx) => tx`select count(*)::int as n from tenant_members
                 where tenant_id = ${SEED_TENANT_A} and role = 'owner' and deleted_at is null`,
    );
    expect(row?.n, 'the exactly-one-owner invariant is broken').toBe(1);
  });

  /**
   * 04 §6. The property that makes sessions rows rather than tokens: a
   * revoked session stops resolving on the very next read, not when a token
   * happens to expire.
   */
  it('a revoked session stops resolving immediately', async () => {
    const sessionId = await asActor(asOwnerA, async (tx) => {
      const rows = await tx`
        insert into sessions (user_id, kind, tenant_id, effective_role, last_activity_at, expires_at)
        values (${SEED_USER_A}, 'tenant', ${SEED_TENANT_A}, 'owner', now(), now() + interval '12 hours')
        returning id
      `;
      return rows[0]?.id as string;
    });

    const live = await asActor(
      asOwnerA,
      (tx) => tx`select id from sessions where id = ${sessionId} and revoked_at is null`,
    );
    expect(live.length).toBe(1);

    await asActor(
      asOwnerA,
      (tx) => tx`update sessions set revoked_at = now() where id = ${sessionId}`,
    );

    const dead = await asActor(
      asOwnerA,
      (tx) => tx`select id from sessions where id = ${sessionId} and revoked_at is null`,
    );
    expect(dead.length).toBe(0);

    created.sessions.push(sessionId);
  });

  it("another user cannot read someone else's session", async () => {
    const sessionId = await asActor(asOwnerA, async (tx) => {
      const rows = await tx`
        insert into sessions (user_id, kind, tenant_id, effective_role, last_activity_at, expires_at)
        values (${SEED_USER_A}, 'tenant', ${SEED_TENANT_A}, 'owner', now(), now() + interval '12 hours')
        returning id
      `;
      return rows[0]?.id as string;
    });

    // The security property the unsigned session cookie depends on: swapping
    // the cookie for another session's id must find nothing.
    const stolen = await asActor(
      asOwnerB,
      (tx) => tx`select id from sessions where id = ${sessionId}`,
    );
    expect(stolen.length, 'a session id names a session another user can read').toBe(0);

    created.sessions.push(sessionId);
  });
});
