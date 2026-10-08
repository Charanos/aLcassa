import type { Metadata } from 'next';
import Link from 'next/link';
import { EmailAccessShell } from '@/components/access/EmailAccessShell';
import { EmailLinkConfirmation } from '@/components/access/EmailLinkConfirmation';
import { Button } from '@/components/primitives/Button';
import { emailPurposeSchema } from '@/lib/auth/emailLink';

export const metadata: Metadata = {
  title: 'Confirm your email link',
  robots: { index: false, follow: false },
  referrer: 'strict-origin',
};

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; code?: string; token_hash?: string; error?: string }>;
}) {
  const params = await searchParams;
  const purpose = emailPurposeSchema.safeParse(params.type);
  if (!purpose.success || params.error || (params.code && params.token_hash))
    return (
      <EmailAccessShell
        purpose={params.type === 'invite' ? 'invite' : 'recovery'}
        unavailable
        title="This link could not be verified"
        lede="The link may have expired or already been used. Request a new one and open the latest email."
      >
        <Button asChild variant="secondary" className="w-full">
          <Link href={params.type === 'recovery' ? '/forgot-password' : '/sign-in'}>
            {params.type === 'recovery' ? 'Request a new link' : 'Return to sign in'}
          </Link>
        </Button>
      </EmailAccessShell>
    );
  return (
    <EmailAccessShell
      purpose={purpose.data}
      title={purpose.data === 'invite' ? 'Welcome to your workspace' : 'Confirm your reset link'}
      lede={
        purpose.data === 'invite'
          ? 'One quick check before you choose your password and enter your workspace.'
          : 'Confirm your email link before choosing a new password.'
      }
    >
      <EmailLinkConfirmation
        purpose={purpose.data}
        code={params.code}
        tokenHash={params.token_hash}
      />
    </EmailAccessShell>
  );
}
