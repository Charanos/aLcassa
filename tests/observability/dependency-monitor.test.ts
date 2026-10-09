import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import {
  deliverPending,
  emptyMonitorState,
  monitorUrl,
  probeDependency,
  recordProbe,
} from '@/lib/observability/dependencyMonitor';

const at = () => new Date().toISOString();
const sample = (
  state: ReturnType<typeof emptyMonitorState>,
  status: 'healthy' | 'unavailable' | 'slow',
) =>
  recordProbe(state, { target: 'service', status, durationMs: 5, requestId: randomUUID() }, at());

describe('Dependency monitor transitions', () => {
  it('requires sustained failure and recovery, with one correlated incident', () => {
    const state = emptyMonitorState();
    sample(state, 'unavailable');
    sample(state, 'unavailable');
    expect(state.pending).toHaveLength(0);
    sample(state, 'unavailable');
    sample(state, 'unavailable');
    expect(state.pending).toHaveLength(1);
    sample(state, 'healthy');
    expect(state.pending).toHaveLength(1);
    sample(state, 'healthy');
    sample(state, 'healthy');
    expect(state.pending.map((e) => e.kind)).toEqual(['outage', 'recovery']);
    expect(state.pending[0]!.incidentId).toBe(state.pending[1]!.incidentId);
  });
  it('resets consecutive failures after a healthy observation', () => {
    const state = emptyMonitorState();
    for (let i = 0; i < 3; i++) {
      sample(state, 'unavailable');
      sample(state, 'healthy');
    }
    expect(state.pending).toHaveLength(0);
    sample(state, 'slow');
    sample(state, 'slow');
    sample(state, 'slow');
    expect(state.pending[0]!.status).toBe('slow');
  });
  it('retains failed delivery and preserves event IDs and outage-before-recovery ordering', async () => {
    const state = emptyMonitorState();
    sample(state, 'unavailable');
    sample(state, 'unavailable');
    sample(state, 'unavailable');
    sample(state, 'healthy');
    sample(state, 'healthy');
    const ids = state.pending.map((e) => e.id);
    await expect(
      deliverPending(state, () => Promise.reject(new Error('sink unavailable'))),
    ).rejects.toThrow();
    expect(state.pending.map((e) => e.id)).toEqual(ids);
    const delivered: string[] = [];
    expect(
      await deliverPending(state, (e) => {
        delivered.push(e.id);
        return Promise.resolve();
      }),
    ).toBe(2);
    expect(delivered).toEqual(ids);
    expect(state.pending).toEqual([]);
  });
  it('rejects credentials, query strings, redirects to untrusted URLs and nonlocal plain HTTP', () => {
    for (const value of [
      'http://example.com/health',
      'https://user:password@example.com/health',
      'https://example.com/health?secret=x',
      'https://example.com/health#secret',
    ])
      expect(() => monitorUrl(value)).toThrow();
    expect(monitorUrl('http://127.0.0.1:8126/service/v1/ready')).toContain('8126');
    expect(monitorUrl('https://example.com/health')).toBe('https://example.com/health');
  });
  it('never includes response bodies, addresses or arbitrary fields in alert events', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(503);
      response.end('PRIVATE_PASSWORD_CANARY');
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing probe address.');
      const probe = await probeDependency('service', `http://127.0.0.1:${address.port}`);
      expect(probe.status).toBe('unavailable');
      expect(JSON.stringify(probe)).not.toMatch(/PRIVATE_|127\.0\.0\.1/);
      const state = emptyMonitorState();
      for (let i = 0; i < 3; i++) recordProbe(state, probe, at());
      expect(Object.keys(state.pending[0]!).sort()).toEqual([
        'at',
        'id',
        'incidentId',
        'kind',
        'requestId',
        'status',
        'target',
      ]);
    } finally {
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    }
  });
  it('treats network timeout and redirect as unavailable', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(302, { Location: 'http://127.0.0.1:1/private' });
      response.end();
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing probe address.');
      expect((await probeDependency('service', `http://127.0.0.1:${address.port}`)).status).toBe(
        'unavailable',
      );
      expect((await probeDependency('service', 'http://127.0.0.1:1/ready', 50)).status).toBe(
        'unavailable',
      );
    } finally {
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    }
  });
});
