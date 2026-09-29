import type { NextConfig } from 'next';

/**
 * The Supabase project's hostname, for `images.remotePatterns`.
 *
 * Resolved at build time from the same variable the CSP reads at request time,
 * so the two cannot disagree about which origin is allowed to serve an avatar.
 * Unparseable or unset yields `undefined` and the pattern is simply omitted —
 * `next/image` then refuses the URL, which is a visible broken avatar rather
 * than an invisible hole.
 */
const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw).hostname;
  } catch {
    return undefined;
  }
})();

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
  /*
   * ⚠ A VERIFICATION BUILD MUST NOT SHARE A DIRECTORY WITH THE DEV SERVER.
   * `next build` and `next dev` both write `.next`; running the first while
   * the second is serving corrupts the running server's output under it.
   * `NEXT_DIST_DIR=.next-verify pnpm build` checks a change without touching
   * the server someone is looking at. Unset, nothing changes.
   */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
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
  experimental: {
    /**
     * ⚠ THE DEFAULT IS 1MB AND THE AVATAR CEILING IS 2MB, SO WITHOUT THIS THE
     * TWO DISAGREE AND NEXT WINS.
     *
     * `updateConsoleAvatar` receives the image as `FormData` through a server
     * action, and Next refuses a request body over `bodySizeLimit` before any
     * application code runs. A 1.4MB upload would therefore be rejected by the
     * framework with a generic error, while the product's own validation — the
     * one that produces a sentence an operator can act on — never executed.
     *
     * Set just above `MAX_AVATAR_BYTES` so the application's limit is always
     * the one that fires, and the refusal is always the one that explains
     * itself. In practice the browser's downscale puts a photograph under
     * 100KB, so neither limit is reached by a real upload; this exists so the
     * pathological case fails in the right place.
     */
    serverActions: { bodySizeLimit: '2.5mb' },
  },

  // Next's own type requires this to return a Promise. Nothing here needs to
  // await anything, so `Promise.resolve(...)` returns one directly rather
  // than marking the function `async` with no `await` inside it, which is a
  // lint error in its own right.
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }]);
  },
  images: {
    /**
     * ⚠ THE SUPABASE HOST IS READ FROM THE ENVIRONMENT, NOT HARDCODED.
     *
     * Avatars are served from this deployment's own storage bucket, and each
     * environment has a different project host. Deriving it keeps production,
     * staging and a local instance each trusting exactly one origin — the same
     * rule the CSP in `middleware.ts` follows, for the same reason.
     *
     * The `pathname` is narrowed to the public object route rather than `/**`,
     * so this entry authorises the bucket API and not every route the Supabase
     * project exposes.
     */
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHost,
              port: '',
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),
      {
        protocol: 'https' as const,
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
