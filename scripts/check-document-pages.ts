import { writeFileSync, mkdirSync } from 'node:fs';
import { PROJECT_DOCS } from '../src/lib/presentation/documents';

/** Read-only acceptance against the disposable production build; no sessions or provider access. */
async function main() {
  const origin = 'http://127.0.0.1:3100';
  const routes = [
    '/project-tracker',
    '/project-tracker/verification',
    '/project-tracker/security',
    ...PROJECT_DOCS.filter((doc) => doc.audience === 'client').map((doc) => `/docs/${doc.slug}`),
  ];
  const pages = new Map<string, string>();
  const results: { route: string; status: number; headings: number; links: number }[] = [];
  for (const route of routes) {
    const response = await fetch(`${origin}${route}`, { signal: AbortSignal.timeout(30_000) });
    const html = await response.text();
    if (response.status !== 200 || !/<h1\b/.test(html))
      throw Error(`Document page failed: ${route} (${response.status})`);
    pages.set(route, html);
    results.push({
      route,
      status: response.status,
      headings: [...html.matchAll(/<h[1-4]\b/g)].length,
      links: [...html.matchAll(/<a\b/g)].length,
    });
  }
  let fragments = 0;
  const assets = new Set<string>();
  for (const [route, html] of pages) {
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"<>]+)"/g)) {
      const url = new URL(match[1]!.replaceAll('&amp;', '&'), `${origin}${route}`);
      if (url.origin !== origin) continue;
      const target = pages.get(url.pathname);
      if (url.pathname.startsWith('/docs/') || url.pathname.startsWith('/project-tracker')) {
        if (!target) throw Error(`Unpublished document route: ${route} → ${url.pathname}`);
        if (url.hash) {
          const id = decodeURIComponent(url.hash.slice(1));
          if (!target.includes(`id="${id}"`))
            throw Error(`Missing document anchor: ${route} → ${url.pathname}${url.hash}`);
          fragments++;
        }
      } else if (url.pathname.startsWith('/verification/')) assets.add(url.pathname);
      else if (!['/app', '/platform'].includes(url.pathname))
        throw Error(`Unexpected document link: ${route} → ${url.pathname}`);
    }
  }
  for (const asset of assets) {
    const response = await fetch(`${origin}${asset}`, { signal: AbortSignal.timeout(15_000) });
    if (response.status !== 200 || !(await response.arrayBuffer()).byteLength)
      throw Error(`Missing public evidence asset: ${asset}`);
  }
  const privateResponse = await fetch(`${origin}/docs/01-brief-and-decisions`, {
    redirect: 'manual',
  });
  if (privateResponse.status !== 404)
    throw Error('Internal working document is publicly reachable');
  mkdirSync('.test-report/phase-one', { recursive: true });
  writeFileSync(
    '.test-report/phase-one/document-pages.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        localOnly: true,
        passed: true,
        pages: results,
        fragments,
        assets: assets.size,
        privateDocumentStatus: 404,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Document pages passed: ${results.length} routes, ${fragments} anchors, ${assets.size} evidence assets; internal source refused.`,
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Document verification failed');
  process.exitCode = 1;
});
