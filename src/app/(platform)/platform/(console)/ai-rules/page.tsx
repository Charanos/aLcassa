import type { Metadata } from 'next';
import { IconFileText } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { EmptyState } from '@/components/primitives/EmptyState';

export const metadata: Metadata = { title: 'Master rules' };

/**
 * Ported onto the console surfaces so this screen shares the shell's page
 * frame, eyebrow and display title. The body lands with its milestone; what
 * matters now is that switching to it does not shift the content edge or
 * change the heading register.
 */
export default function Page() {
  return (
    <ConsolePage>
      <ConsoleHeader eyebrow="/platform/ai-rules" title="Master rules" />
      <p className="t-body mt-3" style={{ color: 'var(--text-secondary)', maxWidth: 'var(--measure-body)' }}>
        Assistant behaviour every workspace inherits, and the propagation state of the current version.
      </p>
      <div
        className="mt-6 rounded-overlay"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)', boxShadow: 'var(--glass-highlight), var(--shadow-sm)' }}
      >
        <EmptyState icon={IconFileText} title="No master rules published" body="Publishing a version propagates it to every workspace and records the version in each audit log." />
      </div>
    </ConsolePage>
  );
}