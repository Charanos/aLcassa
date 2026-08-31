import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/primitives/Toast';
import { GsapProvider } from '@/components/structure/GsapProvider';
import './globals.css';

/**
 * 02 §10. Only the marketing page and the three legal pages are indexed;
 * everything under /app, /platform, /api and /invite is disallowed in
 * robots.txt and noindexed per route group.
 */
/*
 * ⚠ THE WORDMARK IS `aLcassa`, MIXED CASE, CAPITAL L.
 *
 * BRAND.md §1 marks `Alcassa` as the one form the brand guidance prohibits
 * explicitly, and title-casing is precisely what a `<title>` template invites.
 * The capitalisation is load-bearing everywhere it is technically possible,
 * which includes here: a browser tab and a search result are product-facing
 * copy, not identifiers.
 *
 * The lowercase `alcassa` remains correct in code — cookie names, package
 * names, env prefixes, URLs — and is not a violation of the rule.
 */
export const metadata: Metadata = {
  title: { default: 'aLcassa', template: '%s · aLcassa' },
  description: 'One inbox for every message your customers send.',
  applicationName: 'aLcassa',
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 03 §17. 200% zoom with no truncation and no horizontal scroll, which means
  // the user must be allowed to zoom.
  maximumScale: 5,
  // ⚠ ONE THEME. The product ships light only — see the note in globals.css.
  // Declaring `light dark` here would tell the browser to render its own
  // form controls, scrollbars and autofill in dark when the OS is dark, on a
  // page that is permanently light. That mismatch is the exact flash this
  // token set was built to avoid.
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* 03 §17. Skip link first, tenant switcher second: stepping into a
            tenant is the commonest keyboard action the owner takes. */}
        <a
          href="#main"
          className="visually-hidden focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:block focus-visible:rounded-chip focus-visible:border focus-visible:border-rule focus-visible:bg-panel focus-visible:px-3 focus-visible:py-2"
        >
          Skip to content
        </a>
        <GsapProvider>
          <ToastProvider>{children}</ToastProvider>
        </GsapProvider>
      </body>
    </html>
  );
}
