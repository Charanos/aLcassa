import { describe, expect, it } from 'vitest';
import { companyInput } from '@/modules/settings/companyInput';

const valid = {
  name: 'Acme',
  contactEmail: 'hello@example.test',
  timezone: 'Africa/Nairobi',
  locale: 'en-KE',
  version: 1,
};

describe('company settings input', () => {
  it('normalizes surrounding whitespace without changing the company name', () => {
    expect(
      companyInput.parse({ ...valid, name: '  Acme  ', contactEmail: ' hello@example.test ' }),
    ).toEqual(valid);
  });
  it('requires a recognized timezone, supported locale, valid email and integer version', () => {
    for (const change of [
      { name: '' },
      { contactEmail: 'invalid' },
      { timezone: 'Invalid/Zone' },
      { locale: 'dev' },
      { version: -1 },
      { version: 1.5 },
    ]) {
      expect(companyInput.safeParse({ ...valid, ...change }).success).toBe(false);
    }
  });
  it('rejects caller-selected tenant and actor identifiers', () => {
    expect(companyInput.safeParse({ ...valid, tenantId: 'another-tenant' }).success).toBe(false);
    expect(companyInput.safeParse({ ...valid, actorId: 'another-person' }).success).toBe(false);
  });
});
