import Link from 'next/link';
import type { Metadata } from 'next';
import { IconBuilding } from '@tabler/icons-react';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field, PasswordField } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Accept your invitation',
  robots: { index: false, follow: false },
};

/**
 * 02 §3 · 10 §3.
 *
 * The token IS the credential: 32 bytes from a CSPRNG, hashed at rest, single
 * use, seven day expiry. Resolution happens through a security-definer function
 * because the acceptor has no membership yet and therefore cannot resolve a
 * tenant context. 05 §4 · the note in 02_identity.sql.
 *
 * Three refusal states, each with its own copy, because "this link does not
 * work" tells the reader nothing about what to do next:
 *
 *   expired     ask the inviter for a new one
 *   accepted    sign in instead
 *   revoked     ask the inviter whether that was a mistake
 */
export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ state?: 'expired' | 'accepted' | 'revoked' }>;
}) {
  const { token } = await params;
  const { state } = await searchParams;

  // TODO(M2): resolve the token server side and render the real names.
  const company = 'Acme Industrial';
  const inviter = 'Grace Wanjiku';
  const role = 'agent';

  if (state) {
    const copy = {
      expired: {
        title: 'This invitation has expired',
        body: `Ask ${inviter} to send a new one.`,
      },
      accepted: {
        title: 'You have already joined',
        body: `You are already a member of ${company}. Sign in to continue.`,
      },
      revoked: {
        title: 'This invitation was withdrawn',
        body: `Ask ${inviter} if you think that is a mistake.`,
      },
    }[state];

    return (
      <AuthShell eyebrow="Invitation" title={copy.title} lede={copy.body} aside={<TenantAside />}>
        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Invitation" title={`Join ${company}`} aside={<TenantAside />}>
      <div
        className="mb-6 flex items-start gap-3 rounded-panel border p-4"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--rule-soft)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <IconBuilding size={18} stroke={1.5} aria-hidden className="mt-0.5 text-[var(--copper-ink)]" />
        <div>
          <p className="t-compact text-[var(--ink-primary)]">
            {inviter} invited you to join {company} as {role}.
          </p>
          <p className="t-caption mt-1 text-[var(--ink-tertiary)]">
            An agent handles customer messages and has read-only access to settings.
          </p>
        </div>
      </div>

      <form className="grid gap-4" method="post" action={`/api/v1/invitations/accept/${token}`}>
        <Field label="Your name" name="fullName" autoComplete="name" required />

        <PasswordField
          label="Choose a password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          helper="At least 12 characters."
        />

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">
          Accept invitation
        </Button>
      </form>
    </AuthShell>
  );
}
