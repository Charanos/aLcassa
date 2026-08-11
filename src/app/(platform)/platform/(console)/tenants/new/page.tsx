import Link from 'next/link';
import type { Metadata } from 'next';
import { IconChevronRight } from '@tabler/icons-react';
import { ConsolePage } from '@/components/console/Surface';
import { ProvisionForm } from '@/components/console/ProvisionForm';
import { getProvisionOptions, getWorkspaces } from '@/lib/console/data';

export const metadata: Metadata = { title: 'Provision a workspace' };

/**
 * Provision a workspace. `Provision.dc.html`.
 *
 * A real, breadcrumb-navigable page rather than a modal, matching the design
 * and matching how every other creation flow in this console works —
 * provisioning is a five-step transaction with real consequences (an owner
 * receives a real invitation), and a page gives it a URL, a back button, and
 * room for the "what happens on submit" manifest the design puts beside it.
 */
export default async function ProvisionPage() {
  const [options, workspaces] = await Promise.all([getProvisionOptions(), getWorkspaces()]);
  const existingSlugs = workspaces.map((w) => w.slug);

  return (
    <ConsolePage>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2">
        <Link
          href="/platform/tenants"
          className="t-compact whitespace-nowrap"
          style={{ color: 'var(--text-secondary)' }}
        >
          Workspaces
        </Link>
        <IconChevronRight size={13} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
        <span style={{ font: '400 var(--text-sm)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>
          new
        </span>
      </nav>

      <div className="mt-3.5 border-b pb-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <h1 className="display display-lg" style={{ color: 'var(--text-primary)' }}>
          Provision a workspace
        </h1>
        <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', maxWidth: '66ch' }}>
          Four fields. The owner receives an invitation and sets their own password; you never see
          it.
        </p>
      </div>

      <div className="mt-6">
        <ProvisionForm model={options} existingSlugs={existingSlugs} />
      </div>
    </ConsolePage>
  );
}
