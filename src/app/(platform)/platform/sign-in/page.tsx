import Link from 'next/link';
import type { Metadata } from 'next';
import { demoAccessEnabled } from '@/lib/auth/demoAccess';
import {
  IconArrowRight,
  IconBuildingSkyscraper,
  IconHistory,
  IconShieldLock,
} from '@tabler/icons-react';
import { AuthShell, PlatformAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field, PasswordField } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Platform sign in',
  robots: { index: false, follow: false },
};

/**
 * Platform Sign In with 1-click Demo Mode Bypass.
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
        <div className="space-y-4">
          {/*
            Demo bypass, rendered only where /api/demo would answer. These
            links set an OWNER CONSOLE session without authenticating anyone,
            which is why the gate matters more on this page than on the
            tenant one. See lib/auth/demoAccess.
          */}
          {demoAccessEnabled() ? (
            <div
              className="rounded-panel border p-4 transition-all duration-300"
              style={{
                background: 'color-mix(in oklab, var(--text-inverse) 6%, transparent)',
                borderColor: 'color-mix(in oklab, var(--text-inverse) 16%, transparent)',
              }}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  asChild
                  variant="primary"
                  size="md"
                  className="w-full justify-center gap-2 text-xs"
                >
                  <Link href="/api/demo?role=platform">
                    <IconShieldLock size={14} stroke={1.75} />
                    <span>Admin Console</span>
                    <IconArrowRight size={13} />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="secondary"
                  size="md"
                  className="w-full justify-center gap-2 text-xs"
                >
                  <Link href="/api/demo?role=tenant">
                    <IconBuildingSkyscraper size={14} stroke={1.75} />
                    <span>Workspace Inbox</span>
                    <IconArrowRight size={13} />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-2.5">
            <IconHistory
              size={15}
              stroke={1.5}
              aria-hidden
              className="mt-0.5 shrink-0 text-[var(--text-tertiary)]"
            />
            <p className="t-caption text-[var(--text-tertiary)]">
              Sessions last eight hours. Two-factor authentication is recommended and is quoted
              separately.
            </p>
          </div>
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
