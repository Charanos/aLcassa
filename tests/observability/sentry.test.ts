import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/nextjs';
import { scrubEvent, sentryEnabled } from '../../src/lib/observability/sentry';

/**
 * 04 §12 · 05 I-16. THE SCRUBBER.
 *
 * ⚠ AN ERROR REPORT IS AN EXFILTRATION PATH.
 *
 * It carries request bodies, headers, query strings and local state to a
 * third-party service, read by whoever holds a Sentry seat rather than by
 * whoever holds database access. `05 I-16` keeps customer fields out of logs;
 * a crash report is a log with a wider audience and a longer memory.
 *
 * Every case below is a thing that must NOT arrive at Sentry. They are
 * written as "does not contain" rather than "equals", because the failure
 * that matters is a value getting through, not a shape changing.
 */

/** A minimal event with the fields Sentry actually populates. */
function eventWith(overrides: Partial<ErrorEvent>): ErrorEvent {
  return { event_id: 'abc', ...overrides } as ErrorEvent;
}

describe('sentry scrubber · request data', () => {
  it('redacts a password out of a request body', () => {
    const scrubbed = scrubEvent(
      eventWith({
        request: { data: { email: 'a@b.test', password: 'hunter2-the-real-one' } },
      }),
    );

    const serialised = JSON.stringify(scrubbed);
    expect(serialised).not.toContain('hunter2-the-real-one');
  });

  it('redacts a token out of a request body', () => {
    const scrubbed = scrubEvent(
      eventWith({ request: { data: { token: 'sb_secret_live_value_here' } } }),
    );
    expect(JSON.stringify(scrubbed)).not.toContain('sb_secret_live_value_here');
  });

  /**
   * ⚠ HEADERS ARE DROPPED, NOT REDACTED.
   *
   * `redact` works on known key names, and the header carrying something is
   * the one nobody thought of. A session cookie in a crash report is a live
   * credential sitting in a third-party interface.
   */
  it('drops every header except the correlation id', () => {
    const scrubbed = scrubEvent(
      eventWith({
        request: {
          headers: {
            cookie: 'aLcassa_tenant_session=9f2a-live-session-id',
            authorization: 'Bearer sk_live_token',
            'x-request-id': 'req-123',
            'user-agent': 'Mozilla/5.0',
          },
        },
      }),
    );

    const serialised = JSON.stringify(scrubbed);
    expect(serialised).not.toContain('9f2a-live-session-id');
    expect(serialised).not.toContain('sk_live_token');
    // The one header worth keeping: it links the report to the audit row.
    expect(scrubbed?.request?.headers).toEqual({ 'x-request-id': 'req-123' });
  });

  it('drops headers entirely when there is no correlation id', () => {
    const scrubbed = scrubEvent(
      eventWith({ request: { headers: { cookie: 'session=secret-value' } } }),
    );
    expect(JSON.stringify(scrubbed)).not.toContain('secret-value');
    expect(scrubbed?.request?.headers).toEqual({});
  });

  /**
   * Recovery and invitation tokens travel in URLs. Both are bearer
   * credentials for as long as they live.
   */
  it('replaces the query string rather than trying to parse it', () => {
    const scrubbed = scrubEvent(
      eventWith({
        request: {
          url: 'https://alcassa.app/invite/accept',
          query_string: 'token=live-invitation-token-value&next=/app',
        },
      }),
    );

    expect(JSON.stringify(scrubbed)).not.toContain('live-invitation-token-value');
    expect(scrubbed?.request?.query_string).toBe('[redacted]');
    // The path stays — it is what makes the report locatable.
    expect(scrubbed?.request?.url).toContain('/invite/accept');
  });
});

describe('sentry scrubber · attached state', () => {
  it('redacts anything a call site put in extra', () => {
    const scrubbed = scrubEvent(eventWith({ extra: { apiKey: 'sb_secret_attached_by_hand' } }));
    expect(JSON.stringify(scrubbed)).not.toContain('sb_secret_attached_by_hand');
  });

  it('redacts contexts', () => {
    const scrubbed = scrubEvent(
      eventWith({
        contexts: { custom: { password: 'context-password-value' } } as ErrorEvent['contexts'],
      }),
    );
    expect(JSON.stringify(scrubbed)).not.toContain('context-password-value');
  });

  /**
   * 01 D-09 · 05 I-16. Sentry attaches an address and an IP by default. An
   * opaque id is enough to correlate a report with an audit row, and the
   * audit row is where the identity legitimately lives.
   */
  it('reduces the user to an opaque id', () => {
    const scrubbed = scrubEvent(
      eventWith({
        user: {
          id: 'user-uuid',
          email: 'grace@acme-industrial.example',
          ip_address: '203.0.113.7',
          username: 'grace',
        },
      }),
    );

    const serialised = JSON.stringify(scrubbed);
    expect(serialised).not.toContain('grace@acme-industrial.example');
    expect(serialised).not.toContain('203.0.113.7');
    expect(scrubbed?.user).toEqual({ id: 'user-uuid' });
  });
});

describe('sentry scrubber · shape', () => {
  it('leaves an event with nothing sensitive alone', () => {
    const scrubbed = scrubEvent(eventWith({ message: 'something went wrong' }));
    expect(scrubbed?.message).toBe('something went wrong');
  });

  it('is off when no DSN is configured, which is the local default', () => {
    // Neither variable is set in the test environment, and nothing should
    // initialise or attempt to send.
    expect(sentryEnabled()).toBe(false);
  });
});
