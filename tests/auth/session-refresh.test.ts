import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { refreshSupabaseSession } from '@/lib/auth/supabase/middleware';

const mocked = vi.hoisted(
  (): {
    getSession: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    options: unknown;
  } => ({
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn(),
    options: undefined,
  }),
);
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: unknown) => {
    mocked.options = options;
    return { auth: mocked };
  }),
}));
vi.mock('@/lib/auth/supabase/env', () => ({
  supabaseUrl: () => 'http://127.0.0.1:55421',
  supabasePublishableKey: () => 'public-verification-key',
}));

describe('Edge session refresh boundary', () => {
  it('refreshes cookies without treating the cached session identity as authorization', async () => {
    const request = new NextRequest('http://localhost/app');
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', 'nonce-preserved');
    await refreshSupabaseSession(request, response);
    expect(mocked.getSession).toHaveBeenCalledOnce();
    expect(mocked.getUser).not.toHaveBeenCalled();
    const options = mocked.options as {
      cookies: {
        setAll: (values: { name: string; value: string; options: { httpOnly: boolean } }[]) => void;
      };
    };
    options.cookies.setAll([
      {
        name: 'provider-refresh-fixture',
        value: 'rotated-verification-value',
        options: { httpOnly: true },
      },
    ]);
    expect(request.cookies.get('provider-refresh-fixture')?.value).toBe(
      'rotated-verification-value',
    );
    expect(response.cookies.get('provider-refresh-fixture')?.value).toBe(
      'rotated-verification-value',
    );
    expect(response.headers.get('Content-Security-Policy')).toBe('nonce-preserved');
  });
});
