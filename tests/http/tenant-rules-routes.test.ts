import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createResolvedContext, type ResolvedContext } from '@/lib/db/context';
import { AppError, ERROR_CODES } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  read: vi.fn(),
  publish: vi.fn(),
  restore: vi.fn(),
}));
vi.mock('@/lib/auth/resolve', () => ({ resolveSessionDoor: mocks.resolve }));
vi.mock('@/modules/aiRules', () => ({
  readTenantRules: mocks.read,
  publishTenantRules: mocks.publish,
  restoreTenantRules: mocks.restore,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
import { GET } from '@/app/api/v1/ai-rules/route';
import { POST } from '@/app/api/v1/ai-rules/publish/route';
import { GET as version } from '@/app/api/v1/ai-rules/versions/[id]/route';

const tenantId = randomUUID();
function context(role: 'owner' | 'agent' = 'owner') {
  return createResolvedContext({
    tenantId,
    role,
    actorId: randomUUID(),
    actorType: 'user',
    actorLabel: 'Route verification',
    supportMode: false,
    requestId: 'rules-route-test',
  });
}
function request(path: string, body?: string, origin = 'http://localhost:3100') {
  return new NextRequest(`http://localhost:3100/api/v1/ai-rules${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { origin, 'x-request-id': 'rules-route-test', 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body }),
  });
}
const segment = { params: Promise.resolve({}) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolve.mockResolvedValue(context());
});

describe('tenant instruction HTTP boundary', () => {
  it('current reads omit historical versions, authors and publication notes even for an agent', async () => {
    mocks.resolve.mockResolvedValue(context('agent'));
    mocks.read.mockResolvedValue({
      master: { versionNumber: 3 },
      current: {
        id: randomUUID(),
        versionNumber: 2,
        content: { tone: 'Calm' },
        publishedAt: new Date(),
        authoredBy: 'private-author-canary',
        changeNote: 'private-note-canary',
      },
      revision: {},
      versions: ['private-history-canary'],
      authors: { 'private-author-canary': 'Private author' },
    });
    const response = await GET(request(''), segment);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe('rules-route-test');
    for (const canary of [
      'private-author-canary',
      'private-note-canary',
      'private-history-canary',
      'Private author',
    ])
      expect(body).not.toContain(canary);
    expect(JSON.parse(body) as unknown).toMatchObject({
      data: { current: { content: { tone: 'Calm' } } },
    });
  });
  it('blocks agents before publication or version-history reads', async () => {
    mocks.resolve.mockResolvedValue(context('agent'));
    expect((await POST(request('/publish', '{}'), segment)).status).toBe(403);
    expect(
      (await version(request('/versions/any'), { params: Promise.resolve({ id: randomUUID() }) }))
        .status,
    ).toBe(403);
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('refuses cross-origin publishing before the domain mutation', async () => {
    const response = await POST(request('/publish', '{}', 'https://untrusted.example'), segment);
    expect(response.status).toBe(403);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('returns typed validation for malformed JSON and invalid version identifiers', async () => {
    const response = await POST(request('/publish', '{'), segment);
    expect(response.status).toBe(422);
    expect((await response.json()) as unknown).toMatchObject({
      error: { code: 'validation.failed' },
    });
    expect(
      (await version(request('/versions/invalid'), { params: Promise.resolve({ id: 'invalid' }) }))
        .status,
    ).toBe(422);
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('preserves not-found semantics for an identifier absent from the scoped domain result', async () => {
    mocks.read.mockResolvedValue({ versions: [] });
    const response = await version(request('/versions/foreign'), {
      params: Promise.resolve({ id: randomUUID() }),
    });
    expect(response.status).toBe(404);
    expect((await response.json()) as unknown).toMatchObject({ error: { code: 'not_found' } });
    expect((mocks.read.mock.calls[0]![0] as ResolvedContext).tenantId).toBe(tenantId);
  });
  it('refuses unauthenticated reads with correlated errors before reading settings', async () => {
    mocks.resolve.mockRejectedValue(new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED));
    const response = await GET(request(''), segment);
    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('rules-route-test');
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
