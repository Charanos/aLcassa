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

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ state?: 'expired' | 'accepted' | 'revoked' }>;
}) {
  const { token } = await params;
  const { state } = await searchParams;

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
        className="mb-6 flex items-start gap-3 rounded-panel border p-4 shadow-sm"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <IconBuilding size={18} stroke={1.5} aria-hidden className="mt-0.5 text-amber-500 shrink-0" />
        <div>
          <p className="t-compact font-medium" style={{ color: 'var(--text-primary)' }}>
            {inviter} invited you to join {company} as {role}.
          </p>
          <p className="t-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
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

        <Button type="submit" variant="accent" size="lg" className="mt-2 w-full">
          Accept invitation
        </Button>
      </form>
    </AuthShell>
  );
}
