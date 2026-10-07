import { describe, expect, it } from 'vitest';
import { activityDate, decodeActivityCursor, encodeActivityCursor } from '@/lib/tenant/activity';

const now = new Date('2026-10-06T09:00:00.000Z');
const id = '00000000-0000-0000-0000-000000000001';

describe('activity cursor and dates', () => {
  it('preserves database microseconds and the snapshot boundary through pagination', () => {
    const cursor = {
      at: new Date('2026-10-06T08:00:00.123Z'),
      atWire: '2026-10-06T08:00:00.123456Z',
      id,
      asOf: now,
      asOfWire: now.toISOString(),
    };
    expect(decodeActivityCursor(encodeActivityCursor(cursor), now)).toEqual(cursor);
  });

  it('rejects malformed, oversized, future and inverted cursors', () => {
    const invalid = [
      'a'.repeat(513),
      '<script>',
      'e30',
      Buffer.from(
        JSON.stringify({ at: '2026-02-30T08:00:00.000Z', asOf: now.toISOString(), id }),
      ).toString('base64url'),
      encodeActivityCursor({ at: new Date(now.getTime() + 1), id, asOf: now }),
      encodeActivityCursor({ at: now, id, asOf: new Date(now.getTime() + 1) }),
    ];
    for (const cursor of invalid) expect(() => decodeActivityCursor(cursor, now)).toThrow();
    expect(decodeActivityCursor(undefined, now)).toBeNull();
  });

  it('formats a cross-midnight event in the workspace timezone with its year', () => {
    const event = new Date('2026-10-05T22:15:00Z');
    expect(activityDate(event, 'Africa/Nairobi', 'en-GB')).toBe('6 Oct 2026, 01:15');
    expect(activityDate(event, 'UTC', 'en-GB')).toBe('5 Oct 2026, 22:15');
  });
  it('preserves and validates snapshot boundaries within one millisecond', () => {
    const cursor = {
      at: now,
      atWire: '2026-10-06T09:00:00.000122Z',
      id,
      asOf: now,
      asOfWire: '2026-10-06T09:00:00.000123Z',
    };
    expect(decodeActivityCursor(encodeActivityCursor(cursor), now, cursor.asOfWire)).toEqual(
      cursor,
    );
    expect(() =>
      decodeActivityCursor(
        encodeActivityCursor({ ...cursor, atWire: '2026-10-06T09:00:00.000124Z' }),
        now,
        cursor.asOfWire,
      ),
    ).toThrow();
    expect(() =>
      decodeActivityCursor(encodeActivityCursor(cursor), now, '2026-10-06T09:00:00.000122Z'),
    ).toThrow();
  });
});
