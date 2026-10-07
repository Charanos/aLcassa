import type { Metadata, Viewport } from 'next';
import { FlashToasts } from '@/components/primitives/FlashToasts';
import { ToastProvider } from '@/components/primitives/Toast';
import { GsapProvider } from '@/components/structure/GsapProvider';
import './globals.css';

/**
 * 02 §10. Only the marketing page and the three legal pages are indexed;
 * everything under /app, /platform, /api and /invite is disallowed in
 * robots.txt and noindexed per route group.
 */
/* Preserve the aLcassa wordmark capitalization in public metadata. */
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
  // The product uses the shared light theme.
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
          <ToastProvider>
            {/* Announces anything a redirect left behind — see lib/flash.ts
                for why sign-in and sign-out could not toast without it. */}
            <FlashToasts />
            {children}
          </ToastProvider>
        </GsapProvider>
      </body>
    </html>
  );
}
