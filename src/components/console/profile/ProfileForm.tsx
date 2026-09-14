'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/primitives/Toast';
import { IdentityCard } from '@/components/console/profile/IdentityCard';
import { UnsavedBar } from '@/components/console/profile/UnsavedBar';
import { checkName } from '@/lib/console/profileName';
import { updateConsoleProfileName } from '@/app/(platform)/platform/(console)/profile-actions';

/**
 * The page's one piece of shared state — the name draft — and the floating bar
 * that commits it.
 *
 * ⚠ THIS COMPONENT IS A CLIENT COMPONENT THAT RENDERS SERVER CHILDREN, which
 * is the whole reason the profile can have a page-level unsaved-changes bar
 * without going back to being one giant `'use client'` screen.
 *
 * The bar has to be `sticky` at the END of the page: sticky positioning only
 * works inside the element's own container, so a bar rendered inside the
 * identity card would stop following the reader the moment they scrolled past
 * that card — which is exactly when they most need it. That means the draft
 * state has to live above every card, and the naive conclusion is that every
 * card must therefore be client code.
 *
 * It does not. `main` and `rail` are ReactNodes constructed on the SERVER and
 * passed through as props: the security checklist, the device list, the access
 * rail and the limits card are all rendered to HTML on the server and handed to
 * this component as opaque already-rendered trees. This file never looks inside
 * them and they never hydrate. Same inversion `PagedList` uses to page server
 * children, applied to state instead of to windowing.
 *
 * ⚠ SAVING IS A TOAST NOW, AND IT WAS INLINE BEFORE. The earlier version put
 * success in the card's own footer on the argument that the reader was still
 * looking at the field. With the floating bar they may be anywhere on the page,
 * and the save revalidates the sidebar and the top bar as well — so the outcome
 * genuinely lands somewhere other than where the reader is looking, which is
 * the condition 03 §20 reserves toasts for. The inline status line stays as the
 * `aria-live` announcement, so nothing is only in a toast.
 */
export function ProfileForm({
  name: serverName,
  email,
  emailVerified,
  initials,
  avatarUrl,
  live,
  main,
  rail,
}: {
  name: string;
  email: string;
  emailVerified: boolean | null;
  initials: string;
  avatarUrl: string | null;
  /**
   * The model is the database's rather than the fixture's. False disables
   * every write on this page with a stated reason — see `PreviewNotice`.
   */
  live: boolean;
  /** Server-rendered. Passed through, never inspected. */
  main: React.ReactNode;
  rail: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState(serverName);
  const [outcome, setOutcome] = useState<{ tone: 'saved' | 'error'; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * ⚠ THE SERVER'S NAME IS THE BASELINE, AND IT CAN CHANGE UNDER US.
   *
   * `router.refresh()` after a save re-renders this tree with the new value, so
   * without this the field would keep comparing against the name the page was
   * first built with and report itself dirty forever. It also covers the
   * genuine case — the same account renamed in another tab.
   *
   * ⚠ ADJUSTED DURING RENDER, NOT IN AN EFFECT. React's documented pattern for
   * state that tracks a prop, and the same reasoning `PagedList` gives for
   * clamping its page during render: an effect correcting state after paint
   * shows one frame of the stale value first. Setting state during render of
   * the same component is not a loop — React re-runs this component
   * immediately, before touching the DOM or any child.
   *
   * It deliberately does NOT clobber an edit in progress: if the reader has
   * typed something, their draft wins and the baseline moves underneath it.
   */
  const [baseline, setBaseline] = useState(serverName);
  if (baseline !== serverName) {
    const wasClean = draft === baseline;
    setBaseline(serverName);
    if (wasClean) setDraft(serverName);
  }

  const check = checkName(draft);
  const dirty = check.ok ? check.name !== serverName : draft.trim() !== serverName;
  /* An invalid draft is only worth complaining about once the reader has
     actually changed something. A field that opens red because it is empty for
     a moment is scolding somebody who has done nothing. */
  const invalid = dirty && !check.ok;

  function save() {
    /* The bar is hidden entirely when the page is a preview, but a keyboard
       shortcut can still reach this — 231821b5 in the field. One guard, at the
       one place that writes. */
    if (!live || !dirty || !check.ok || pending) return;
    setOutcome(null);
    startTransition(async () => {
      const result = await updateConsoleProfileName(draft);
      if (result.ok) {
        /* The canonical name, not the draft: the server trims and collapses
           whitespace, and a field still showing "Brian   Masira" after saving
           "Brian Masira" has quietly desynchronised from the row it wrote. */
        setDraft(result.name);
        setBaseline(result.name);
        setOutcome({ tone: 'saved', message: 'Saved.' });
        toast({
          tone: 'success',
          title: 'Name updated',
          description: `You appear as ${result.name} in the console and in every audit entry from now on.`,
        });
        router.refresh();
      } else {
        setOutcome({ tone: 'error', message: result.error });
        toast({ tone: 'failure', title: 'Could not save your name', description: result.error });
      }
    });
  }

  function discard() {
    setDraft(serverName);
    setOutcome(null);
    inputRef.current?.focus();
  }

  return (
    <>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 gap-5">
          <IdentityCard
            draft={draft}
            onDraft={(next) => {
              setDraft(next);
              setOutcome(null);
            }}
            serverName={serverName}
            email={email}
            emailVerified={emailVerified}
            initials={initials}
            avatarUrl={avatarUrl}
            live={live}
            inputRef={inputRef}
            dirty={dirty}
            invalid={invalid}
            error={invalid ? check.error : null}
            outcome={outcome}
            pending={pending}
            onSave={save}
            onDiscard={discard}
          />
          {main}
        </div>

        <div className="grid gap-5 xl:sticky xl:top-3 xl:self-start">{rail}</div>
      </div>

      {/* ⚠ THE BAR OFFERS A SAVE, SO IT MUST NOT APPEAR WHEN SAVING IS
          IMPOSSIBLE. On the preview path every write is refused before it
          reaches the database, and a floating "Save changes" over data that
          belongs to nobody is the screen's most confident lie. `PreviewNotice`
          carries the explanation and the way out instead. */}
      {live ? (
        <UnsavedBar
          dirty={dirty}
          pending={pending}
          invalid={invalid}
          message={
            invalid
              ? check.ok
                ? ''
                : check.error
              : pending
                ? 'Saving your name…'
                : 'You have unsaved changes to your name.'
          }
          onSave={save}
          onDiscard={discard}
        />
      ) : null}
    </>
  );
}
