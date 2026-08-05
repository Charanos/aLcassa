import type { NextConfig } from 'next';

/**
 * Security headers per 04 §7. The CSP nonce is applied per request in
 * `src/middleware.ts`; what is set here is everything that is static.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Asks the browser to send the OS colour preference with each request, so the
  // theme resolves on the server and there is no flash and no inline script.
  // See src/lib/theme.ts for why that matters here. 03 §19 · 04 §7.
  { key: 'Accept-CH', value: 'Sec-CH-Prefers-Color-Scheme' },
  { key: 'Critical-CH', value: 'Sec-CH-Prefers-Color-Scheme' },
  { key: 'Vary', value: 'Sec-CH-Prefers-Color-Scheme, Cookie' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 02 §9. A trailing slash would make every audited route string ambiguous.
  trailingSlash: false,

  typescript: {
    // 11 §6 rule 19. A type error is a failed build, never a warning.
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Native and connection-holding packages stay on the server. The service role
  // client must never be traced into a client bundle.
  serverExternalPackages: ['@node-rs/argon2', 'postgres'],

  // Next's own type requires this to return a Promise. Nothing here needs to
  // await anything, so `Promise.resolve(...)` returns one directly rather
  // than marking the function `async` with no `await` inside it, which is a
  // lint error in its own right.
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }]);
  },
};

export default nextConfig;
