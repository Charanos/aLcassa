import { redact } from './redact';

export { redact, REDACTION_KEYS } from './redact';

/**
 * 04 §8. One structured line per request and per job, with a correlation ID on
 * every line. No secrets, no customer record fields, ever.
 *
 * `console.*` is a lint error across the codebase (06 §11), because a stray
 * console.log during debugging is the documented route by which a customer
 * record reaches a log. This module is the single exception and it redacts
 * before it writes.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  requestId?: string;
  tenantId?: string;
  actorId?: string;
  actorType?: 'user' | 'platform_admin' | 'service' | 'system';
  supportMode?: boolean;
  route?: string;
  door?: 'session' | 'service' | 'platform';
  durationMs?: number;
  [key: string]: unknown;
};

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = process.env.LOG_LEVEL as LogLevel | undefined;
  if (configured && configured in LEVEL_ORDER) return LEVEL_ORDER[configured];
  return process.env.NODE_ENV === 'production' ? LEVEL_ORDER.info : LEVEL_ORDER.debug;
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  if (LEVEL_ORDER[level] < threshold()) return;

  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg: message,
    ...(redact(context) as Record<string, unknown>),
  });

  // The one place in the application permitted to write to stdout. Vercel
  // forwards this to Axiom; the shape is one JSON object per line so it is
  // queryable without a parser. Note this is `process.stdout.write` rather than
  // `console.*`, which the lint rule bans everywhere including here.
  process.stdout.write(line + '\n');
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),

  /** Binds a context onto every line, so a handler never repeats the request ID. */
  child(bound: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        write('debug', message, { ...bound, ...context }),
      info: (message: string, context?: LogContext) =>
        write('info', message, { ...bound, ...context }),
      warn: (message: string, context?: LogContext) =>
        write('warn', message, { ...bound, ...context }),
      error: (message: string, context?: LogContext) =>
        write('error', message, { ...bound, ...context }),
    };
  },
};

export type Logger = ReturnType<typeof logger.child>;
