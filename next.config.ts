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
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // ⚠ NO `Accept-CH: Sec-CH-Prefers-Color-Scheme` ANY MORE.
  //
  // That hint existed so the server could resolve a light/dark preference
  // before the first byte. The product now ships one theme, so asking every
  // browser for the OS colour preference on every request would collect a
  // signal nothing reads — and `Critical-CH` in particular costs a connection
  // restart on the first visit to pay for it.
  //
  // `Vary: Cookie` stays: responses still differ by session.
  { key: 'Vary', value: 'Cookie' },
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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
