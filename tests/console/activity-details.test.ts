import { describe, expect, it } from 'vitest';
import { activityDetails } from '@/lib/tenant/activityDetails';

describe('Customer-safe Activity details', () => {
  it('shows recorded instruction publication and restoration notes without exposing content', () => {
    for (const action of ['rules.published', 'rules.rolled_back']) {
      expect(
        activityDetails(
          action,
          { versionNumber: 3 },
          {
            versionNumber: 1,
            changeNote: 'Restore agreed support hours',
            content: { secret: 'private-content' },
          },
        ),
      ).toEqual({
        changes: [{ label: 'Version', before: '3', after: '1' }],
        reason: 'Restore agreed support hours',
      });
    }
    expect(activityDetails('credential.created', {}, { changeNote: 'private-marker' })).toEqual({
      changes: [],
    });
  });
  it('shows the before and after subscription and its customer-facing reason', () => {
    const details = activityDetails(
      'subscription.plan_assigned',
      { plan: 'business', monthly: 17000 },
      { plan: 'pro', monthly: 3400, reason: 'Right-size the subscription' },
    );
    expect(details.changes).toContainEqual({ label: 'Plan', before: 'Business', after: 'Pro' });
    expect(details.changes[1]?.after).toContain('3,400');
    expect(details.reason).toBe('Right-size the subscription');
  });
  it('preserves zero and unlimited without saying a winning override changed', () => {
    expect(
      activityDetails(
        'plan.limit_changed',
        { planLimit: 10, effectiveLimit: null },
        { planLimit: 0, effectiveLimit: null },
      ).changes,
    ).toEqual([{ label: 'Plan allowance', before: '10', after: '0' }]);
    expect(
      activityDetails('subscription.override_granted', {}, { limitValue: null }).changes,
    ).toContainEqual({ label: 'Override allowance', before: 'Not recorded', after: 'Unlimited' });
  });
  it('drops secrets, nested arbitrary data and unsupported action payloads', () => {
    const marker = 'private-key-marker';
    const raw = {
      keyHash: marker,
      secret: marker,
      nested: { secret: marker },
      role: { secret: marker },
    };
    expect(JSON.stringify(activityDetails('credential.created', raw, raw))).not.toContain(marker);
    expect(JSON.stringify(activityDetails('member.role_changed', {}, raw))).not.toContain(marker);
    expect(activityDetails('unknown.action', {}, { plan: 'pro', reason: marker })).toEqual({
      changes: [],
    });
  });
  it('keeps reasons on recorded support visits', () => {
    expect(
      activityDetails('support.entered', null, {
        reason: 'Owner requested troubleshooting',
        sessionSecret: 'private',
      }),
    ).toEqual({ changes: [], reason: 'Owner requested troubleshooting' });
  });
});
