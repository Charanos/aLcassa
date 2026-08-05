import type { Metadata, Viewport } from 'next';
import { getThemePreference, resolveTheme } from '@/lib/theme';
import './globals.css';

/**
 * 02 §10. Only the marketing page and the three legal pages are indexed;
 * everything under /app, /platform, /api and /invite is disallowed in
 * robots.txt and noindexed per route group.
 */
export const metadata: Metadata = {
  title: { default: 'Conduit', template: '%s · Conduit' },
  description: 'One inbox for every message your customers send.',
  applicationName: 'Conduit',
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 03 §17. 200% zoom with no truncation and no horizontal scroll, which means
  // the user must be allowed to zoom.
  maximumScale: 5,
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preference = await getThemePreference();
  const theme = await resolveTheme(preference);

  return (
    <html lang="en" data-theme={theme} data-theme-preference={preference}>
      <body>
        {/* 03 §17. Skip link first, tenant switcher second: stepping into a
            tenant is the commonest keyboard action the owner takes. */}
        <a
          href="#main"
          className="visually-hidden focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:block focus-visible:rounded-chip focus-visible:border focus-visible:border-rule focus-visible:bg-panel focus-visible:px-3 focus-visible:py-2"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
