import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import { authRequestOrigin } from '@/lib/auth/requestOrigin';

function request(url: string, host?: string, additional: Record<string, string> = {}) {
  return new NextRequest(url, { headers: { ...(host ? { host } : {}), ...additional } });
}

describe('Authentication request origin', () => {
  it.each([
    ['127.0.0.1', 'localhost'],
    ['[::1]', '127.0.0.1'],
  ])('preserves %s framework URLs submitted through %s', (frameworkHost, clientHost) => {
    expect(
      authRequestOrigin({
        url: `http://${frameworkHost}:3100/api/v1/auth/sign-in`,
        headers: new Headers({ host: `${clientHost}:3100` }),
      }),
    ).toBe(`http://${clientHost}:3100`);
  });
  it.each(['127.0.0.1:3100', '[::1]:3100', 'localhost:3100'])(
    'keeps a loopback form and its redirect on %s',
    (host) => {
      const input = request(`http://${host}/api/v1/auth/sign-in`, host);
      expect(authRequestOrigin(input)).toBe(`http://${host}`);
      const response = NextResponse.redirect(
        new URL('/app/settings/team', authRequestOrigin(input)),
        303,
      );
      expect(response.headers.get('location')).toBe(`http://${host}/app/settings/team`);
    },
  );
  it('preserves the protected deep link without moving its cookies to another origin', () => {
    const input = request(
      'http://127.0.0.1:3100/app/settings/team?filter=active',
      '127.0.0.1:3100',
    );
    const destination = new URL('/sign-in', authRequestOrigin(input));
    destination.searchParams.set('next', '/app/settings/team?filter=active');
    expect(destination.origin).toBe('http://127.0.0.1:3100');
    expect(destination.searchParams.get('next')).toBe('/app/settings/team?filter=active');
  });
  it.each([
    'outside.example:3100',
    '127.0.0.1:3101',
    '127.0.0.1:3100/path',
    'account@127.0.0.1:3100',
    '127.0.0.1:3100#outside',
    '127.0.0.1:65536',
  ])('refuses an untrusted loopback authority %s', (host) => {
    expect(authRequestOrigin(request('http://localhost:3100/app', host))).toBe(
      'http://localhost:3100',
    );
  });
  it('does not use client Origin or forwarded headers to choose a destination', () => {
    const input = request('http://localhost:3100/app', undefined, {
      origin: 'https://outside.example',
      'x-forwarded-host': 'outside.example',
      'x-forwarded-proto': 'https',
    });
    expect(authRequestOrigin(input)).toBe('http://localhost:3100');
  });
  it('cannot replace a hosted origin with a forged loopback Host header', () => {
    const input = request('https://a-lcassa.vercel.app/api/v1/auth/sign-in', '127.0.0.1:3100');
    expect(authRequestOrigin(input)).toBe('https://a-lcassa.vercel.app');
  });
  it('preserves the public origin when forwarded headers disagree', () => {
    const input = request('https://console.example.test/app', 'outside.example', {
      'x-forwarded-host': 'another.example',
    });
    expect(authRequestOrigin(input)).toBe('https://console.example.test');
  });
});
