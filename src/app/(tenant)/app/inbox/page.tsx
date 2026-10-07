import type { Metadata } from 'next';
import { Button } from '@/components/primitives/Button';

export const metadata: Metadata = { title: 'Messaging' };

/** Describe the Phase Two inbox scope without presenting simulated messages as live content. */
export default function InboxPlaceholderPage() {
  return (
    <div
      data-slot="placeholder-surface"
      className="mx-auto py-16"
      style={{ maxWidth: 'var(--measure-prose)' }}
    >
      <h1 className="t-heading text-[var(--text-primary)]">Messaging arrives next</h1>

      <div className="mt-5 grid gap-4">
        <p className="t-body text-[var(--text-secondary)]">
          This is where every message from WhatsApp, Instagram, Messenger and your website will land
          in one thread per customer, handled by your team.
        </p>
        <p className="t-body text-[var(--text-secondary)]">
          The platform underneath it is built and running: your workspace, your team, your
          credentials and your assistant rules are all live and ready for it.
        </p>
        <p className="t-body text-[var(--text-secondary)]">
          Channel connections are the focus of the next phase.
        </p>
      </div>

      <div className="mt-7">
        <Button variant="secondary" size="lg">
          Tell me when it is ready
        </Button>
      </div>
    </div>
  );
}
