import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconArrowRight,
  IconBolt,
  IconBuildingSkyscraper,
  IconShieldLock,
} from '@tabler/icons-react';
import { AuthShell, TenantAside } from '@/components/access/AuthShell';
import { Button } from '@/components/primitives/Button';
import { Field, PasswordField } from '@/components/primitives/Field';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

/**
 * Sign In Page with Demo Mode Quick Access.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      eyebrow="Workspace"
      title="Sign in"
      aside={<TenantAside />}
      footer={
        <div className="space-y-4">
          {/* ── Demo Mode Quick Access Banner & Instant Bypass Buttons ── */}
          <div
            className="rounded-panel border p-4 transition-all duration-300 shadow-sm"
            style={{
              background: 'var(--surface-raised)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <IconBolt size={15} stroke={1.75} className="text-amber-500 dark:text-amber-400" />
                <span className="t-eyebrow font-medium tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  DEMO MODE INSTANT ACCESS
                </span>
              </div>
              <span
                className="t-chip inline-flex items-center gap-1 rounded-chip px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium"
              >
                1-Click Bypass
              </span>
            </div>

            <p className="t-caption leading-relaxed mb-3.5" style={{ color: 'var(--text-secondary)' }}>
              Skip credentials and jump straight into the full live administrative console or tenant workspace.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="primary" size="md" className="w-full justify-center gap-2 text-xs">
                <Link href="/api/demo?role=platform">
                  <IconShieldLock size={14} stroke={1.75} />
                  <span>Admin Dashboard</span>
                  <IconArrowRight size={13} />
                </Link>
              </Button>

              <Button asChild variant="secondary" size="md" className="w-full justify-center gap-2 text-xs">
                <Link href="/api/demo?role=tenant">
                  <IconBuildingSkyscraper size={14} stroke={1.75} />
                  <span>Workspace Inbox</span>
                  <IconArrowRight size={13} />
                </Link>
              </Button>
            </div>
          </div>

          <p className="t-caption text-center" style={{ color: 'var(--text-tertiary)' }}>
            No workspace yet?{' '}
            <Link
              href="/sign-up"
              className="text-[var(--text-action)] underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Create one
            </Link>
          </p>
        </div>
      }
    >
      <form className="grid gap-4" method="post" action="/api/v1/auth/sign-in">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.co.ke"
        />

        <PasswordField label="Password" name="password" autoComplete="current-password" required />

        <div className="flex items-center justify-between gap-4">
          <Link
            href="/forgot-password"
            className="t-caption text-[var(--text-action)] underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
