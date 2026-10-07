'use client';

import Link, { useLinkStatus } from 'next/link';
import { createPortal } from 'react-dom';
import type { ComponentProps } from 'react';
import { IconLoader2 } from '@tabler/icons-react';

/** Next owns navigation timing, including query-only changes, cancellation and errors. */
export default function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <NavigationStatus />
    </Link>
  );
}

function NavigationStatus() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="t-compact pointer-events-none fixed top-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2.5 text-[var(--text-primary)] shadow-md"
    >
      <IconLoader2 size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />
      Loading page…
    </div>,
    document.body,
  );
}
