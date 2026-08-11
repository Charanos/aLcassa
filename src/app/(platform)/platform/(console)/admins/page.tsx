import type { Metadata } from 'next';
import { IconShieldLock } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { EmptyState } from '@/components/primitives/EmptyState';

export const metadata: Metadata = { title: 'Admins' };

/**
 * Ported onto the console surfaces so this screen shares the shell's page
 * frame, eyebrow and display title. The body lands with its milestone; what
 * matters now is that switching to it does not shift the content edge or
 * change the heading register.
 */
export default function Page() {
  return (
    <ConsolePage>
      <ConsoleHeader eyebrow="/platform/admins" title="Admins" />
      <p className="t-body mt-3" style={{ color: 'var(--text-secondary)', maxWidth: 'var(--measure-body)' }}>
        Who can operate the platform, what each of them can reach, and when they last did.
      </p>
      <div
        className="mt-6 rounded-overlay"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)', boxShadow: 'var(--glass-highlight), var(--shadow-sm)' }}
      >
        <EmptyState icon={IconShieldLock} title="No additional admins" body="Every operator with console access appears here, with the grant that gave it to them." />
      </div>
    </ConsolePage>
  );
}