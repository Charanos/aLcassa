'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';

type Draft = { busy: boolean; form: RefObject<HTMLFormElement | null> };
type Register = (id: string, draft: Draft) => () => void;
const Registration = createContext<Register | null>(null);
const pointKey = '__alcassaNavigationPoint';
function point(state: unknown): number | null {
  if (!state || typeof state !== 'object' || !(pointKey in state)) return null;
  const value = (state as Record<string, unknown>)[pointKey];
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}
function stateAt(state: unknown, position: number) {
  return { ...(state && typeof state === 'object' ? state : {}), [pointKey]: position };
}

/** Preserve router history and draft values until the reader explicitly chooses to leave. */
export function UnsavedChangesBoundary({ children }: { children: ReactNode }) {
  const router = useRouter();
  const drafts = useRef(new Map<string, Draft>());
  const [review, setReview] = useState<{ resume: () => void } | null>(null);
  const [, render] = useState(0);
  const opener = useRef<HTMLElement | null>(null);
  const approvedUnload = useRef(false);
  const register = useCallback<Register>((id, draft) => {
    drafts.current.set(id, draft);
    render((n) => n + 1);
    return () => {
      drafts.current.delete(id);
      render((n) => n + 1);
    };
  }, []);
  useEffect(() => {
    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);
    let position = point(history.state) ?? 0;
    originalReplace.call(history, stateAt(history.state, position), '');
    const push: History['pushState'] = (state: unknown, title, url) => {
      const next = position + 1;
      originalPush.call(history, stateAt(state, next), title, url);
      position = next;
    };
    const replace: History['replaceState'] = (state: unknown, title, url) => {
      originalReplace.call(history, stateAt(state, position), title, url);
    };
    history.pushState = push;
    history.replaceState = replace;
    let restored: (() => void) | null = null;
    let approvedTraversal = false;
    let approvedForm: HTMLFormElement | null = null;
    const ask = (resume: () => void) => {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setReview({ resume });
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!drafts.current.size || approvedUnload.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      if (
        !drafts.current.size ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (
        !anchor ||
        anchor.hasAttribute('download') ||
        (anchor.target && anchor.target !== '_self')
      )
        return;
      const destination = new URL(anchor.href, location.href);
      if (!['http:', 'https:'].includes(destination.protocol)) return;
      if (
        destination.origin === location.origin &&
        destination.pathname === location.pathname &&
        destination.search === location.search
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      ask(() => {
        if (destination.origin === location.origin)
          router.push(destination.pathname + destination.search + destination.hash);
        else {
          approvedUnload.current = true;
          location.assign(destination.href);
        }
      });
    };
    const submit = (event: SubmitEvent) => {
      if (
        !drafts.current.size ||
        event.defaultPrevented ||
        !(event.target instanceof HTMLFormElement)
      )
        return;
      const form = event.target;
      if (approvedForm === form) {
        approvedForm = null;
        return;
      }
      if ([...drafts.current.values()].some((draft) => draft.form.current === form)) return;
      event.preventDefault();
      event.stopPropagation();
      const data = new FormData(form, event.submitter);
      const action = form.action,
        method = form.method;
      ask(() => {
        if (form.isConnected) {
          approvedForm = form;
          approvedUnload.current = true;
          form.requestSubmit(event.submitter?.isConnected ? event.submitter : undefined);
          return;
        }
        const resumed = document.createElement('form');
        resumed.action = action;
        resumed.method = method;
        resumed.enctype = form.enctype;
        for (const [name, value] of data) {
          const input = document.createElement('input');
          input.name = name;
          if (typeof value === 'string') {
            input.type = 'hidden';
            input.value = value;
          } else {
            input.type = 'file';
            const files = new DataTransfer();
            files.items.add(value);
            input.files = files.files;
          }
          resumed.append(input);
        }
        approvedUnload.current = true;
        document.body.append(resumed);
        resumed.submit();
      });
    };
    const pop = (event: PopStateEvent) => {
      if (restored) {
        event.stopImmediatePropagation();
        const resume = restored;
        restored = null;
        resume();
        return;
      }
      const destination = point(event.state);
      if (approvedTraversal || !drafts.current.size || destination === position) {
        approvedTraversal = false;
        position = destination ?? position;
        return;
      }
      // Unindexed entries precede the boundary's first entry in this document.
      const distance = destination === null ? 1 : position - destination;
      event.stopImmediatePropagation();
      restored = () =>
        ask(() => {
          approvedTraversal = true;
          history.go(-distance);
        });
      history.go(distance);
    };
    document.addEventListener('click', click, true);
    document.addEventListener('submit', submit, true);
    window.addEventListener('popstate', pop, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      if (history.pushState === push) history.pushState = originalPush;
      if (history.replaceState === replace) history.replaceState = originalReplace;
      document.removeEventListener('click', click, true);
      document.removeEventListener('submit', submit, true);
      window.removeEventListener('popstate', pop, true);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [router]);
  const busy = [...drafts.current.values()].some((draft) => draft.busy);
  return (
    <Registration.Provider value={register}>
      {children}
      <ConfirmDialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open) setReview(null);
        }}
        returnFocusRef={opener}
        title={busy ? 'A change is in progress' : 'Leave without saving?'}
        consequence={
          busy
            ? 'Wait for this request to finish before leaving this page.'
            : 'Your unsaved changes will be discarded. Stay here to finish reviewing them.'
        }
        confirmLabel="Discard and leave"
        cancelLabel="Keep editing"
        tone="destructive"
        disabled={busy}
        onConfirm={() => {
          const next = review;
          setReview(null);
          next?.resume();
        }}
      />
    </Registration.Provider>
  );
}

/** Registers only dirty/busy state and a form reference; never stores draft contents. */
export function useUnsavedChanges(dirty: boolean, busy = false) {
  const register = useContext(Registration),
    id = useId();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (register && (dirty || busy)) return register(id, { busy, form });
  }, [register, id, dirty, busy]);
  return form;
}
