import { type NextRequest, NextResponse } from 'next/server';
import { CHANNELS, type Channel } from '@/modules/channels';

/** Phase Two webhook seam: reject unknown channels, preserve raw signature bytes and return 501 until an adapter exists. */

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
