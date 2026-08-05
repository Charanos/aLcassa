import type { Metadata } from 'next';
import { IconHistory } from '@tabler/icons-react';
import { AuthShell, PlatformAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field, PasswordField } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Platform sign in',
  robots: { index: false, follow: false },
};

/**
 * 02 §3. THE SEPARATE OWNER LOGIN, taken literally.
 *
 * Requirement 4 says "separate owner login" and this is a different URL, a
 * different cookie name, a different session row type, a different rate limit,
 * and NO NAVIGATIONAL PATH FROM THE TENANT SIGN-IN PAGE. A platform admin who
 * is also a tenant user holds two sessions and switches by URL.
 *
 * That is why there is no "sign in as a workspace user instead" link at the
 * bottom of this page, and why the tenant page has no link here. The absence is
 * the feature.
 *
 * The inverted aside is the same structural signal as the console header in
 * 03 §4: you can tell which door you are at before reading a word.
 */
export default function PlatformSignInPage() {
  return (
    <AuthShell
      variant="platform"
      eyebrow="Platform"
      title="Platform sign in"
      lede="This account manages every workspace. Access is logged."
      aside={<PlatformAside />}
      footer={
        <div className="flex items-start gap-2.5">
          <IconHistory
            size={15}
            stroke={1.5}
            aria-hidden
            className="mt-0.5 shrink-0 text-[var(--ink-tertiary)]"
          />
          <p className="t-caption text-[var(--ink-tertiary)]">
            Sessions last eight hours. Two-factor authentication is recommended and is quoted
            separately; it is not in the current scope.
          </p>
        </div>
      }
    >
      <form className="grid gap-4" method="post" action="/api/platform/v1/auth/sign-in">
        <Field label="Email" name="email" type="email" autoComplete="email" required />

        <PasswordField label="Password" name="password" autoComplete="current-password" required />

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
