'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { IconDeviceDesktop, IconShieldCheck } from '@tabler/icons-react';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { revokeSession } from '@/app/(tenant)/app/actions';
import type { AccountSession } from '@/lib/tenant/data';

/** Confirm device changes, then render the server's committed session list. */
export function SessionsList({ sessions: initial }: { sessions: AccountSession[] }) {
  const [sessions, setSessions] = useState(initial);
  const [selection, setSelection] = useState<AccountSession | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(initial);
  useEffect(() => {
    if (previous.current !== initial) {
      previous.current = initial;
      setSessions(initial);
      setRefreshRequired(false);
    }
  }, [initial]);
  const others = sessions.filter((session) => !session.current);
  function review(value: AccountSession | 'all') {
    setError(null);
    setSelection(value);
  }
  function submit() {
    if (!selection || pending) return;
    const id = selection === 'all' ? 'all' : selection.id;
    startTransition(async () => {
      try {
        const result = await revokeSession(id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.sessions) setSessions(result.sessions);
        setRefreshRequired(Boolean(result.refreshRequired));
        setNotice(result.notice ?? 'Session ended.');
        setSelection(null);
      } catch {
        setError(
          'The outcome could not be confirmed. Refresh the device list before trying again.',
        );
        setRefreshRequired(true);
      }
    });
  }
  return (
    <section className="grid gap-5" aria-labelledby="session-devices-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="session-devices-heading"
            ref={heading}
            tabIndex={-1}
            className="t-panel outline-none"
          >
            Your devices
          </h2>
          <p className="t-caption mt-1 text-[var(--text-secondary)]">
            {sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'} · this browser
            stays signed in
          </p>
        </div>
        {others.length > 0 && (
          <Button
            variant="quiet"
            size="sm"
            disabled={pending || refreshRequired}
            onClick={() => review('all')}
          >
            End other sessions
          </Button>
        )}
      </div>
      {notice && (
        <p role="status" className="t-compact flex items-start gap-2 text-[var(--text-secondary)]">
          <IconShieldCheck size={17} className="mt-0.5 shrink-0" aria-hidden />
          {notice}
        </p>
      )}
      <ul
        className="overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
        role="list"
      >
        {sessions.map((session) => (
          <li
            key={session.id}
            className="border-t border-[var(--border-subtle)] px-5 py-5 first:border-t-0 sm:px-6"
          >
            <div className="flex flex-wrap items-center gap-4">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                aria-hidden
              >
                <IconDeviceDesktop size={20} stroke={1.5} />
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="t-body font-medium text-[var(--text-primary)]">
                    {session.device}
                  </span>
                  {session.current && <Badge tone="active">This device</Badge>}
                </div>
                <p className="t-caption mt-1 break-words text-[var(--text-tertiary)]">
                  {session.location} · {session.lastActive}
                </p>
              </div>
              {!session.current && (
                <Button
                  variant="quiet"
                  size="sm"
                  disabled={pending || refreshRequired}
                  aria-label={`End session for ${session.device}`}
                  onClick={() => review(session)}
                >
                  End session
                </Button>
              )}
            </div>
          </li>
        ))}
        {!sessions.length && (
          <li className="t-compact px-6 py-6 text-[var(--text-secondary)]">
            No active sessions are available. Refresh to check your current sign-in.
          </li>
        )}
      </ul>
      <p className="t-caption text-[var(--text-tertiary)]">
        Ending a session removes its access on the next protected request. Use Sign out to leave
        this browser.
      </p>
      {refreshRequired && (
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Refresh device list
        </Button>
      )}
      <ConfirmDialog
        open={Boolean(selection)}
        onOpenChange={(open) => {
          if (!open && !pending) setSelection(null);
        }}
        title={selection === 'all' ? 'End other sessions?' : 'End this session?'}
        consequence="The affected devices will need to sign in again. This browser stays signed in."
        details={
          <p className="t-compact text-[var(--text-secondary)]">
            {selection === 'all'
              ? `${others.length} other ${others.length === 1 ? 'session' : 'sessions'} will end.`
              : selection?.device}
          </p>
        }
        confirmLabel={selection === 'all' ? 'End other sessions' : 'End session'}
        tone="destructive"
        onConfirm={submit}
        loading={pending}
        disabled={refreshRequired}
        error={error}
        returnFocusRef={heading}
      />
    </section>
  );
}
