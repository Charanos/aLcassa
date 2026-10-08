import { describe, expect, it } from 'vitest';
import {
  authProviderEmail,
  credentialCreatedEmail,
  invitationEmail,
  supportSessionEmail,
} from '../../src/modules/email/templates';

describe('Auth provider email templates', () => {
  it.each(['invite', 'recovery'] as const)(
    'preserves the provider proof in %s without external assets',
    (purpose) => {
      const rendered = authProviderEmail(purpose);
      expect(rendered.html).toContain('href="{{ .ConfirmationURL }}"');
      expect(rendered.text).toContain('{{ .ConfirmationURL }}');
      expect(rendered.html).not.toMatch(/<script|<svg|<img|@import|url\(/i);
      expect(rendered.html).toContain('role="presentation"');
      expect(rendered.html).toContain('Keep account links private');
      expect(rendered.subject).not.toMatch(/[\r\n]/);
    },
  );
});

/**
 * 10 §14. The templates are pure — data in, three strings out — so they can be
 * proved without a provider, an account or a network call. That is most of
 * why they are shaped that way.
 *
 * ⚠ THE ESCAPING CASES ARE THE POINT OF THIS FILE.
 *
 * `companyName` and `inviterName` are typed by tenants. A mail client is a
 * worse place to have stored XSS than a browser: the reader has no origin to
 * inspect, no console to check, and some clients still execute more than they
 * should. These cases exist so a future edit that drops an `escapeHtml` call
 * fails here rather than in somebody's inbox.
 */

const BASE = {
  inviterName: 'Grace Wanjiku',
  companyName: 'Acme Industrial',
  role: 'agent',
  acceptUrl: 'https://alcassa.app/invite/abc123',
  expiresAt: new Date('2026-09-03T12:00:00Z'),
};

describe('invitation email', () => {
  it('uses the subject and opening line from the copy deck', () => {
    const rendered = invitationEmail(BASE);

    // 10 §14: `{inviterName} invited you to {companyName}`
    expect(rendered.subject).toBe('Grace Wanjiku invited you to Acme Industrial');
    // 10 §14: `You have been invited to join {companyName} as {role}.`
    expect(rendered.text).toContain('You have been invited to join Acme Industrial as agent.');
    expect(rendered.html).toContain('You have been invited to join Acme Industrial as agent.');
  });

  it('carries the accept link in both parts', () => {
    const rendered = invitationEmail(BASE);

    expect(rendered.html).toContain(BASE.acceptUrl);
    // A client that cannot render HTML must still be able to accept, so the
    // text part is not a courtesy — it is the fallback route in.
    expect(rendered.text).toContain(BASE.acceptUrl);
  });

  it('states the expiry, so the reader knows what they are sitting on', () => {
    const rendered = invitationEmail(BASE);
    expect(rendered.text).toContain('3 September 2026');
    expect(rendered.html).toContain('3 September 2026');
  });

  /** ⚠ The case that catches a dropped escape. */
  it('escapes a workspace name containing markup', () => {
    const rendered = invitationEmail({
      ...BASE,
      companyName: '<script>alert(1)</script>',
    });

    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });

  it('escapes an inviter name containing markup', () => {
    const rendered = invitationEmail({
      ...BASE,
      inviterName: '<img src=x onerror=alert(1)>',
    });

    expect(rendered.html).not.toContain('<img src=x');
    expect(rendered.html).toContain('&lt;img');
  });

  /**
   * The subject is not HTML, so it is deliberately NOT escaped — a subject
   * reading `&lt;b&gt;` in an inbox would be a bug of its own. This case
   * pins that distinction so nobody "fixes" it in the wrong direction.
   */
  it('leaves the subject as plain text', () => {
    const rendered = invitationEmail({ ...BASE, companyName: 'Smith & Sons' });
    expect(rendered.subject).toBe('Grace Wanjiku invited you to Smith & Sons');
    // ...while the same value IS escaped in the markup.
    expect(rendered.html).toContain('Smith &amp; Sons');
  });

  it('escapes a quote in the URL rather than letting it close the attribute', () => {
    const rendered = invitationEmail({
      ...BASE,
      acceptUrl: 'https://alcassa.app/invite/x" onmouseover="alert(1)',
    });
    expect(rendered.html).not.toContain('onmouseover="alert(1)"');
    expect(rendered.html).toContain('&quot;');
  });

  it('renders a preheader so the inbox preview is not the word aLcassa', () => {
    const rendered = invitationEmail(BASE);
    const preheaderIndex = rendered.html.indexOf('You have been invited');
    const brandIndex = rendered.html.indexOf('aLcassa</span>');
    expect(preheaderIndex).toBeGreaterThan(-1);
    // The hidden preheader must come before the visible brand mark, or the
    // client scrapes the brand instead.
    expect(preheaderIndex).toBeLessThan(brandIndex);
  });
});

describe('the two templates that are written ahead of their milestone', () => {
  it('credential created follows the copy deck', () => {
    const rendered = credentialCreatedEmail({
      actorName: 'Grace Wanjiku',
      credentialName: 'Billing sync',
      companyName: 'Acme Industrial',
      dashboardUrl: 'https://alcassa.app/app/settings/credentials',
    });

    expect(rendered.subject).toBe('A new API credential was created');
    expect(rendered.text).toContain(
      'Grace Wanjiku created the credential "Billing sync" in Acme Industrial.',
    );
    // The copy deck's reason for sending it at all: it catches a compromised
    // account, which only works if it says what to do.
    expect(rendered.text).toContain('revoke it in your dashboard');
  });

  it('support session follows the copy deck and names the reason when given', () => {
    const rendered = supportSessionEmail({
      platformAdminName: 'Brian',
      companyName: 'Acme Industrial',
      reason: 'Investigating a failed webhook',
      activityUrl: 'https://alcassa.app/app/settings/audit',
    });

    expect(rendered.subject).toBe('Our support team opened your workspace');
    expect(rendered.text).toContain('Brian opened Acme Industrial to help with a support request.');
    expect(rendered.text).toContain('Investigating a failed webhook');
  });

  it('support session omits the reason line entirely when there is none', () => {
    const rendered = supportSessionEmail({
      platformAdminName: 'Brian',
      companyName: 'Acme Industrial',
      reason: null,
      activityUrl: 'https://alcassa.app/app/settings/audit',
    });

    // Not "Reason given: none" — an empty label is worse than no label.
    expect(rendered.text).not.toContain('Reason given');
    expect(rendered.html).not.toContain('Reason given');
  });
});
