/** One scheduler invocation: probe configured health endpoints and deliver queued transitions. */
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import {
  deliverPending,
  emptyMonitorState,
  monitorUrl,
  probeDependency,
  recordProbe,
} from '../src/lib/observability/dependencyMonitor';

const stateSchema = z.object({
  version: z.literal(1),
  targets: z.record(
    z.object({
      failed: z.number().int().nonnegative(),
      recovered: z.number().int().nonnegative(),
      incidentId: z.string().uuid().nullable(),
    }),
  ),
  pending: z.array(
    z.object({
      id: z.string().uuid(),
      incidentId: z.string().uuid(),
      target: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
      kind: z.enum(['outage', 'recovery']),
      at: z.string().datetime(),
      requestId: z.string().uuid(),
      status: z.enum(['healthy', 'unavailable', 'slow']),
    }),
  ),
});

async function main() {
  const targets = [
    ['application', process.env.MONITOR_APPLICATION_URL],
    ['service', process.env.MONITOR_SERVICE_URL],
    ['identity', process.env.MONITOR_IDENTITY_URL],
  ].flatMap(([target, value]) => (value ? [{ target: target!, url: monitorUrl(value) }] : []));
  if (!targets.length || !process.env.MONITOR_WEBHOOK_URL || !process.env.MONITOR_STATE_FILE)
    throw new Error('Configure monitor targets, webhook and durable state file.');
  const webhook = monitorUrl(process.env.MONITOR_WEBHOOK_URL);
  const file = resolve(process.env.MONITOR_STATE_FILE);
  await mkdir(dirname(file), { recursive: true });
  // Exclusive ownership prevents overlapping scheduler runs from losing queued events.
  const lock = await open(`${file}.lock`, 'wx');
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    const stored = await readFile(file, 'utf8').catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    });
    const state = stored ? stateSchema.parse(JSON.parse(stored)) : emptyMonitorState();
    const probes = await Promise.all(
      targets.map(({ target, url }) => probeDependency(target, url)),
    );
    for (const probe of probes) recordProbe(state, probe, new Date().toISOString());
    const persist = async () => {
      await writeFile(temporary, JSON.stringify(state) + '\n', { mode: 0o600 });
      await rename(temporary, file);
    };
    await persist();
    try {
      await deliverPending(state, async (event) => {
        const response = await fetch(webhook, {
          method: 'POST',
          redirect: 'error',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': event.id,
            ...(process.env.MONITOR_WEBHOOK_TOKEN
              ? { Authorization: `Bearer ${process.env.MONITOR_WEBHOOK_TOKEN}` }
              : {}),
          },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(5000),
        });
        await response.body?.cancel();
        if (!response.ok) throw new Error('Monitoring notification delivery failed.');
      });
    } finally {
      await persist();
    }
    process.stdout.write(
      JSON.stringify({ at: new Date().toISOString(), probes, pending: state.pending.length }) +
        '\n',
    );
  } finally {
    await lock.close();
    await rm(`${file}.lock`);
    await rm(temporary, { force: true });
  }
}
void main().catch(() => {
  process.stderr.write(
    'Dependency monitoring failed; inspect its private state and configuration.\n',
  );
  process.exitCode = 1;
});
