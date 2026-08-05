import type { MetadataRoute } from 'next';

/**
 * 02 §10. Only the marketing page and the three legal pages are indexed.
 * Everything under /app, /platform, /api and /invite is disallowed here and
 * additionally carries `X-Robots-Tag: noindex` from middleware, because a
 * robots.txt is a request and a header is an instruction.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app', '/platform', '/api', '/invite'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/sitemap.xml`,
  };
}
