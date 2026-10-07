import { describe, expect, it } from 'vitest';
import { safeReturnPath } from '../../src/lib/auth/returnPath';

describe('Post-authentication return paths', () => {
  it.each([
    undefined,
    null,
    '',
    'https://outside.example',
    '//outside.example',
    '/\\outside.example',
    '/\t/outside.example',
    '/\n/outside.example',
    '/\r/outside.example',
    'javascript:alert(1)',
    'app/settings',
    '/app\u0000/settings',
  ])('refuses an unsafe destination %j', (next) => {
    expect(safeReturnPath(next, '/app')).toBe('/app');
  });

  it.each([
    '/app',
    '/app/settings/audit?filter=platform#history',
    '/platform/tenants/acme-industrial?tab=billing',
    '/app?search=two%20words',
  ])('preserves a local destination %s', (next) => {
    expect(safeReturnPath(next, '/app')).toBe(next);
  });

  it('normalizes a local path without allowing a cross-origin redirect', () => {
    expect(safeReturnPath('/app/../app/settings', '/app')).toBe('/app/settings');
  });
});
