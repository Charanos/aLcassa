'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/primitives/Button';
import type { EmailPurpose } from '@/lib/auth/emailLink';

type Proof =
  | { proof: 'code'; code: string }
  | { proof: 'hash'; tokenHash: string }
  | { proof: 'session'; accessToken: string; refreshToken: string };

/** Keep implicit-flow credentials out of navigation, analytics and referrers. */
export function EmailLinkConfirmation({
  purpose,
  code,
  tokenHash,
}: {
  purpose: EmailPurpose;
  code?: string;
  tokenHash?: string;
}) {
  const [proof, setProof] = useState<Proof | null>(
    code ? { proof: 'code', code } : tokenHash ? { proof: 'hash', tokenHash } : null,
  );
  const [ready, setReady] = useState(Boolean(code || tokenHash));
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');
    const cleanUrl = new URL(window.location.href);
    cleanUrl.hash = '';
    cleanUrl.searchParams.delete('code');
    cleanUrl.searchParams.delete('token_hash');
    window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search);
    if (!code && !tokenHash && accessToken && refreshToken && fragment.get('type') === purpose) {
      setProof({ proof: 'session', accessToken, refreshToken });
    }
    setReady(true);
  }, [code, tokenHash, purpose]);

  if (!ready)
    return (
      <p role="status" className="text-sm text-[var(--text-secondary)]">
        Checking your link…
      </p>
    );
  if (!proof)
    return (
      <div className="grid gap-4">
        <p role="alert" className="text-sm text-[var(--text-secondary)]">
          This link is incomplete or no longer available. Open the original email, or request a new
          link.
        </p>
        <Button asChild variant="secondary" className="w-full">
          <Link href={purpose === 'recovery' ? '/forgot-password' : '/sign-in'}>
            {purpose === 'recovery' ? 'Request a new link' : 'Return to sign in'}
          </Link>
        </Button>
      </div>
    );
  return (
    <form
      method="post"
      action="/api/v1/auth/email/confirm"
      className="grid gap-4"
      aria-busy={submitting}
      onSubmit={(event) => {
        if (submitting) event.preventDefault();
        else setSubmitting(true);
      }}
    >
      <input type="hidden" name="purpose" value={purpose} />
      {Object.entries(proof).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        Continue to verify your email link before choosing your password.
      </p>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
        {submitting ? 'Verifying your link…' : 'Continue securely'}
      </Button>
    </form>
  );
}
