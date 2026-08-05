'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconX,
  type Icon as TablerIcon,
} from '@tabler/icons-react';

/**
 * 03 §9 · §20. "Bottom-right, 5s, pausable, max 3 stacked." And from the
 * anti-pattern list: "Toast for every action → Toast for asynchronous
 * outcomes only." A toast announces something that finished after the user
 * stopped looking at it; anything that happens as a direct, visible result of
 * a click belongs in the control itself (a button's own loading state, a
 * field's own error), not in a toast layered on top of it.
 */

type ToastTone = 'info' | 'success' | 'attention' | 'failure';

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastInput = Omit<Toast, 'id'>;

const TONE: Record<ToastTone, { icon: TablerIcon; ink: string; rule: string }> = {
  info: { icon: IconInfoCircle, ink: 'var(--slate-ink)', rule: 'var(--slate-rule)' },
  success: { icon: IconCircleCheck, ink: 'var(--verdigris-ink)', rule: 'var(--verdigris-rule)' },
  attention: { icon: IconAlertTriangle, ink: 'var(--ochre-ink)', rule: 'var(--ochre-rule)' },
  failure: { icon: IconAlertOctagon, ink: 'var(--oxide-ink)', rule: 'var(--oxide-rule)' },
};

const MAX_STACKED = 3;
const DURATION_MS = 5000;

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** `useToast()('Rules published', { tone: 'success' })` from anywhere inside
 *  the provider. Not available outside it, which is enforced by the thrown
 *  error rather than a silent no-op: a toast call that goes nowhere and fails
 *  silently is a harder bug to find than one that fails loudly in development. */
export function useToast(): (toast: ToastInput) => void {
  const fn = useContext(ToastContext);
  if (!fn) throw new Error('useToast() must be called inside <ToastProvider>.');
  return fn;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const arm = useCallback(
    (id: string) => {
      const timer = setTimeout(() => dismiss(id), DURATION_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const push = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-(MAX_STACKED - 1)), { ...input, id }]);
      arm(id);
    },
    [arm],
  );

  const pause = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
  }, []);

  const resume = useCallback(
    (id: string) => {
      arm(id);
    },
    [arm],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        // 03 §17: a live region, so an outcome announced visually is also
        // announced to a screen reader without the reader having to be
        // looking at the corner of the screen when it appears.
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 bottom-4 z-[200] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col-reverse gap-2.5"
      >
        {toasts.map((toast) => {
          const tone = TONE[toast.tone];
          const Icon = tone.icon;

          return (
            <div
              key={toast.id}
              role="status"
              onMouseEnter={() => pause(toast.id)}
              onMouseLeave={() => resume(toast.id)}
              className="pointer-events-auto flex items-start gap-3 rounded-panel border p-4"
              style={{
                background: 'var(--surface-raised)',
                borderColor: 'var(--rule-base)',
                boxShadow: 'var(--shadow-overlay)',
              }}
            >
              <Icon size={17} stroke={1.5} aria-hidden className="mt-0.5 shrink-0" style={{ color: tone.ink }} />

              <div className="min-w-0 flex-1">
                <p className="t-compact text-[var(--ink-primary)]">{toast.title}</p>
                {toast.description ? (
                  <p className="t-caption mt-0.5 text-[var(--ink-tertiary)]">{toast.description}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded-chip p-1 text-[var(--ink-tertiary)] transition-colors duration-[var(--motion-fade)] hover:text-[var(--ink-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]"
              >
                <IconX size={14} stroke={1.5} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
