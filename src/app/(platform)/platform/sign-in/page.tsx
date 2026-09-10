import Link from 'next/link';
import type { Metadata } from 'next';
import { demoAccessEnabled } from '@/lib/auth/demoAccess';
import {
  IconArrowRight,
  IconBuildingSkyscraper,
  IconHistory,
  IconShieldLock,
} from '@tabler/icons-react';
import { AuthShell } from '@/components/access/AuthShell';
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
      /*
       * `variant="platform"` used to be passed here. `AuthShell` declared the
       * prop and never read it — like `aside`, which is now real — so it
       * styled nothing. Removed rather than implemented: the console's own
       * chrome is what distinguishes the platform door, and this page is
       * already unmistakably itself.
       */
      title="Platform Operations"
      lede="This administrative account commands every workspace enclave. Sessions are cryptographically logged."
      footer={
        <div className="space-y-4">
          {demoAccessEnabled() ? (
            <div className="space-y-3 pt-1">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[var(--ink-200)]/70" />
                </div>
                <div className="relative flex justify-center text-[10.5px] font-mono uppercase tracking-wider">
                  <span className="bg-white px-2 text-[var(--text-tertiary)]">
                    Reviewer & Demo Mode
                  </span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href="/api/demo?role=platform"
                  className="group flex items-center justify-between rounded-xl border border-[var(--ink-200)]/90 bg-[var(--ink-50)]/40 p-2.5 transition-all hover:bg-[var(--ink-50)] hover:border-[var(--ink-300)] shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-md bg-[var(--danger-bg)] text-[var(--danger-fg)]">
                      <IconShieldLock size={13} stroke={2} />
                    </span>
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">
                      Admin Console
                    </span>
                  </div>
                  <IconArrowRight
                    size={12}
                    className="text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
                  />
                </Link>

                <Link
                  href="/api/demo?role=tenant"
                  className="group flex items-center justify-between rounded-xl border border-[var(--ink-200)]/90 bg-[var(--ink-50)]/40 p-2.5 transition-all hover:bg-[var(--ink-50)] hover:border-[var(--ink-300)] shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-md bg-[var(--success-bg)] text-[var(--success-fg)]">
                      <IconBuildingSkyscraper size={13} stroke={2} />
                    </span>
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">
                      Workspace Inbox
                    </span>
                  </div>
                  <IconArrowRight
                    size={12}
                    className="text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-2.5 pt-1 text-[11.5px] text-[var(--text-tertiary)] font-mono">
            <IconHistory size={14} stroke={1.8} aria-hidden className="mt-0.5 shrink-0 text-[var(--warning-fg)]" />
            <p>
              Administrative sessions auto-expire after 8 hours. Append-only audit logs capture all actions.
            </p>
          </div>
        </div>
      }
    >
      <form className="grid gap-4" method="post" action="/api/platform/v1/auth/sign-in">
        <Field
          label="Administrator email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@alcassa.internal"
        />

        <PasswordField
          label="Master password"
          name="password"
          autoComplete="current-password"
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-2 w-full font-medium shadow-sm hover:shadow-md cursor-pointer"
        >
          Authenticate & enter console
        </Button>
      </form>
    </AuthShell>
  );
}
