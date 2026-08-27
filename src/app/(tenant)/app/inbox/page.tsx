import type { Metadata } from 'next';
import { Button } from '@/components/primitives/Button';

export const metadata: Metadata = { title: 'Messaging' };

/**
 * 02 §5 · 01 D-05 · 10 §7. THE PLACEHOLDER SURFACE.
 *
 * Phase 1 ships a working account for a product whose main surface does not
 * exist. An agent who signs in and finds an empty product will assume it is
 * broken, so this is a designed answer rather than a dead link.
 *
 * WHAT IS DELIBERATELY ABSENT, per 03 §20: no mock message list, no greyed-out
 * inbox behind a "coming soon" overlay, no blurred screenshot, no countdown, no
 * badge floating over anything. Those read as unfinished.
 *
 * Plain type on a plain surface reads as deliberate sequencing. That is the
 * whole trick, and it costs about four hours.
 */
export default function InboxPlaceholderPage() {
  return (
    <div
      data-slot="placeholder-surface"
      className="mx-auto py-16"
      style={{ maxWidth: 'var(--measure-prose)' }}
    >
      <h1 className="t-heading text-[var(--ink-primary)]">Messaging arrives next</h1>

      <div className="mt-5 grid gap-4">
        <p className="t-body text-[var(--ink-secondary)]">
          This is where every message from WhatsApp, Instagram, Messenger and your website will land
          in one thread per customer, handled by your team.
        </p>
        <p className="t-body text-[var(--ink-secondary)]">
          The platform underneath it is built and running: your workspace, your team, your
          credentials and your assistant rules are all live and ready for it.
        </p>
        <p className="t-body text-[var(--ink-secondary)]">
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
