import { type NextRequest, NextResponse } from 'next/server';
import { CHANNELS, type Channel } from '@/modules/channels';

/**
 * 07 §10 · 02 §7. THE WEBHOOK SEAM.
 *
 * ⚠ THIS RETURNS 501 ON PURPOSE AND MUST KEEP DOING SO UNTIL PHASE 2.
 *
 * 07 §10: "Building the route shell now costs an hour and means Phase 2
 * starts from a shape rather than a blank file. Building anything above it is
 * out of scope." What exists here is the ORDER OF OPERATIONS, which is the
 * part that is easy to get wrong and expensive to discover wrong:
 *
 *   1. Reject an unknown channel before touching the body.
 *   2. Read the RAW body — not `req.json()`. A signature is computed over the
 *      exact bytes sent; parsing and re-serialising changes them, and the
 *      check then fails for correct requests and, worse, can be made to pass
 *      for crafted ones.
 *   3. Verify the signature. ONLY THEN parse.
 *   4. Return 200 fast; do the work asynchronously.
 *   5. Be idempotent on the provider's event ID.
 *   6. Store the raw payload.
 *
 * Steps 3 to 6 belong to Phase 2 and are not implemented. Steps 1 and 2 are,
 * because they are what makes step 3 possible at all — a handler that has
 * already consumed the body as JSON cannot verify it afterwards.
 *
 * ⚠ THE TENANT IS NEVER READ FROM THE BODY. It is resolved from the
 * connection record during verification, per `ChannelAdapter.verifyWebhook`.
 * A webhook body is attacker-controlled; a `tenantId` taken from one is a
 * cross-tenant write waiting to happen. 06 §2 forbids it in general and this
 * is the specific route where the temptation is strongest.
 */

function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;

  // 1 · Unknown channel. 404 rather than 400: an unrecognised path should not
  // confirm which channels this platform does support.
  if (!isChannel(channel)) {
    return NextResponse.json(
      {
        error: { code: 'not_found', message: 'That is not here.', requestId: crypto.randomUUID() },
      },
      { status: 404 },
    );
  }

  // 2 · Raw body, before any parsing. See the note above on why this is not
  // `req.json()`. Read and discarded here; Phase 2 passes it to
  // `adapter.verifyWebhook({ rawBody, headers })`.
  await req.text();

  // 3–6 · Phase 2.
  return NextResponse.json(
    {
      error: {
        code: 'not_implemented',
        message: `Channel adapters arrive in the next phase. The ${channel} connection can be created now; nothing receives on it yet.`,
        requestId: crypto.randomUUID(),
      },
    },
    { status: 501 },
  );
}

/**
 * Several providers verify a webhook subscription with a GET carrying a
 * challenge parameter, before any POST is ever delivered. The shape is here
 * so Phase 2 does not rediscover it; the challenge echo itself is per-adapter
 * and is not implemented.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;

  if (!isChannel(channel)) {
    return NextResponse.json(
      {
        error: { code: 'not_found', message: 'That is not here.', requestId: crypto.randomUUID() },
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: 'not_implemented',
        message: 'Subscription verification arrives with the adapter in the next phase.',
        requestId: crypto.randomUUID(),
      },
    },
    { status: 501 },
  );
}
