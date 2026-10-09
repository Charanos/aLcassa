import type { NextConfig } from 'next';

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
  // Responses vary by session; the single theme requires no client color hints.
  { key: 'Vary', value: 'Cookie' },
];

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  // Preserve middleware redirect authorities; Next otherwise rewrites loopback hosts to localhost.
  skipMiddlewareUrlNormalize: true,
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
    serverActions: { bodySizeLimit: '2.5mb' },
  },

  // The headers contract requires a Promise.
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }]);
  },
  images: {
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
