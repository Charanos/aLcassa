import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleAvailability } from '@/lib/auth/providerAvailability';
import { GoogleAccess } from '@/components/access/GoogleAccess';

vi.mock('@/components/primitives/SubmitButton', () => ({
  CustomSubmitButton: ({ children, ...props }: { children: React.ReactNode }) =>
    createElement('button', props, children),
}));
vi.mock('@/components/primitives/IconTile', () => ({ IconTile: () => null }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function settings(body: unknown, status = 200) {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:55421');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-test-key');
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

describe('Configured Google availability', () => {
  it.each([
    [{ external: { google: true } }, 'enabled'],
    [{ external: { google: false } }, 'disabled'],
    [{ external: { google: 'true' } }, 'unavailable'],
    [{ external: {} }, 'unavailable'],
    [null, 'unavailable'],
  ])('requires an explicit provider boolean in %j', async (body, expected) => {
    settings(body);
    expect(await googleAvailability()).toBe(expected);
  });
  it('refuses unknown availability on failed and unreachable settings requests', async () => {
    const fetcher = settings({}, 503);
    expect(await googleAvailability()).toBe('unavailable');
    fetcher.mockRejectedValue(new Error('Unavailable'));
    expect(await googleAvailability()).toBe('unavailable');
  });
  it('bypasses the presentation cache when initiating a provider flow', async () => {
    const fetcher = settings({ external: { google: true } });
    expect(await googleAvailability(true)).toBe('enabled');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ cache: 'no-store' });
  });
  it.each(['sign-in', 'sign-up'] as const)(
    'renders a working provider option for %s',
    async (purpose) => {
      settings({ external: { google: true } });
      const html = renderToStaticMarkup(
        await GoogleAccess({ purpose, next: '/app/settings/team' }),
      );
      expect(html).toContain('action="/api/v1/auth/google"');
      expect(html).toContain('value="/app/settings/team"');
      expect(html).toContain('Continue with Google');
    },
  );
  it.each([false, null])(
    'offers email instead of an unsupported Google action (%j)',
    async (enabled) => {
      settings({ external: { google: enabled } });
      const html = renderToStaticMarkup(
        createElement('main', null, await GoogleAccess({ purpose: 'sign-in' })),
      );
      expect(html).toContain('Google sign-in is currently unavailable.');
      expect(html).not.toContain('/api/v1/auth/google');
      expect(html).not.toContain('Continue with Google');
    },
  );
});
