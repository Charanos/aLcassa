import { randomUUID } from 'node:crypto';

export type ProbeStatus = 'healthy' | 'unavailable' | 'slow';
export type Probe = { target: string; status: ProbeStatus; durationMs: number; requestId: string };
export type Notification = {
  id: string;
  incidentId: string;
  target: string;
  kind: 'outage' | 'recovery';
  at: string;
  requestId: string;
  status: ProbeStatus;
};
type TargetState = { failed: number; recovered: number; incidentId: string | null };
export type MonitorState = {
  version: 1;
  targets: Record<string, TargetState>;
  pending: Notification[];
};
export const emptyMonitorState = (): MonitorState => ({ version: 1, targets: {}, pending: [] });

/** Thresholds suppress flapping; queued events retain their identity across delivery retries. */
export function recordProbe(state: MonitorState, probe: Probe, at: string): void {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(probe.target)) throw new Error('Invalid monitor target.');
  const previous = state.targets[probe.target] ?? { failed: 0, recovered: 0, incidentId: null };
  state.targets[probe.target] = previous;
  if (probe.status === 'healthy') {
    previous.failed = 0;
    previous.recovered++;
    if (previous.incidentId && previous.recovered >= 2) {
      state.pending.push({
        id: randomUUID(),
        incidentId: previous.incidentId,
        target: probe.target,
        kind: 'recovery',
        at,
        requestId: probe.requestId,
        status: probe.status,
      });
      previous.incidentId = null;
    }
  } else {
    previous.recovered = 0;
    previous.failed++;
    if (!previous.incidentId && previous.failed >= 3) {
      previous.incidentId = randomUUID();
      state.pending.push({
        id: randomUUID(),
        incidentId: previous.incidentId,
        target: probe.target,
        kind: 'outage',
        at,
        requestId: probe.requestId,
        status: probe.status,
      });
    }
  }
}

/** Only bounded operational fields leave the monitor; bodies, URLs and credentials stay private. */
export async function probeDependency(
  target: string,
  url: string,
  timeoutMs = 5000,
  slowMs = 2000,
): Promise<Probe> {
  const requestId = randomUUID();
  const started = performance.now();
  try {
    const response = await fetch(url, {
      headers: { 'X-Request-Id': requestId },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    await response.body?.cancel();
    const durationMs = Math.round(performance.now() - started);
    return {
      target,
      requestId,
      durationMs,
      status: !response.ok ? 'unavailable' : durationMs > slowMs ? 'slow' : 'healthy',
    };
  } catch {
    return {
      target,
      requestId,
      durationMs: Math.round(performance.now() - started),
      status: 'unavailable',
    };
  }
}

export async function deliverPending(
  state: MonitorState,
  send: (event: Notification) => Promise<void>,
): Promise<number> {
  let delivered = 0;
  // A failed outage must remain ahead of its recovery. Consumers deduplicate by event ID.
  while (state.pending[0]) {
    await send(state.pending[0]);
    state.pending.shift();
    delivered++;
  }
  return delivered;
}

/** Operator configuration only. No credentials or query strings are accepted in a URL. */
export function monitorUrl(value: string): string {
  const url = new URL(value);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:'))
  )
    throw new Error(
      'Monitoring URLs require HTTPS or local loopback, without credentials or query strings.',
    );
  return url.toString();
}
