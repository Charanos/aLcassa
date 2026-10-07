/** Stable activity pagination and formatting. No database or request dependency. */
export type ActivityCursor = { at: Date; atWire?: string; id: string; asOf: Date };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeActivityCursor(cursor: ActivityCursor): string {
  return Buffer.from(
    JSON.stringify({
      at: cursor.atWire ?? cursor.at.toISOString(),
      id: cursor.id,
      asOf: cursor.asOf.toISOString(),
    }),
  ).toString('base64url');
}

export function decodeActivityCursor(value: string | undefined, now: Date): ActivityCursor | null {
  if (!value) return null;
  if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error('Invalid activity cursor');
  const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid activity cursor');
  const record = parsed as Record<string, unknown>;
  if (
    typeof record.at !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3,6}Z$/.test(record.at) ||
    typeof record.asOf !== 'string' ||
    typeof record.id !== 'string' ||
    !UUID.test(record.id)
  )
    throw new Error('Invalid activity cursor');
  const at = new Date(record.at);
  const asOf = new Date(record.asOf);
  if (!Number.isFinite(at.getTime()) || !Number.isFinite(asOf.getTime()) || at > asOf || asOf > now)
    throw new Error('Invalid activity cursor');
  return { at, atWire: record.at, id: record.id, asOf };
}

export function activityDate(at: Date, timezone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
}
