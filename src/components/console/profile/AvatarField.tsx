'use client';

import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconAlertTriangle,
  IconCamera,
  IconLoader2,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';

import { useToast } from '@/components/primitives/Toast';
import { AuditLine, AuditNote } from '@/components/console/profile/shared';
import { AVATAR_ACCEPT, readableBytes } from '@/lib/storage/avatarRules';
import { prepareAvatar } from '@/lib/storage/prepareAvatar';
import {
  removeConsoleAvatar,
  updateConsoleAvatar,
} from '@/app/(platform)/platform/(console)/profile-actions';

/**
 * The profile photograph: choose, replace, remove.
 *
 * ⚠ WHY THIS EXISTS AT ALL, WHEN THE COPY BESIDE IT USED TO SAY IT NEVER WOULD.
 *
 * The old card carried a sentence — "the console shows no photographs, so an
 * avatar can never leak a face into a screenshot" — which read as a security
 * decision and was actually a description of an unbuilt feature. The schema has
 * carried `user_profiles.avatar_path` from the first migration, the API route
 * `/v1/me` has always accepted it, and the shell was rendering a stock
 * photograph of a stranger in three places because there was nothing real to
 * put there. A product that stores a field, exposes it over its own API, and
 * tells the operator the feature does not exist is not being careful.
 *
 * ⚠ THE UPLOAD IS NOT PART OF THE FORM'S DIRTY STATE, AND THAT IS DELIBERATE.
 *
 * The name field is a draft: typed, reversible, saved when the operator says
 * so. An image is not — the moment they pick a file there is nothing to keep
 * editing, and holding it in limbo behind a Save button means an upload that
 * can be lost by navigating away. Picking commits; removing confirms first.
 * Two different kinds of change, two different contracts, stated here because
 * they sit two inches apart on the same card.
 *
 * ⚠ THE THREE OUTCOMES, as everywhere else on this surface: pending in the
 * control (an overlay on the avatar itself, which is what the operator is
 * looking at), failure inline beneath it, success in a toast — because the
 * revalidation redraws the sidebar, the top bar and the account menu, and the
 * toast is what explains why the whole screen just changed.
 */
export function AvatarField({
  initials,
  src,
  name,
  live,
}: {
  initials: string;
  src: string | null;
  /** False on the preview path: the picker is inert with a stated reason. */
  live: boolean;
  /** For the removal dialog, which names whose face is being deleted. */
  name: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, startTransition] = useTransition();
  /* Preparing is browser work — decode, crop, re-encode — and on a large
     photograph it is long enough to need its own state. Folding it into the
     transition would leave the control looking idle while the tab is busy. */
  const [preparing, setPreparing] = useState(false);

  const pending = busy || preparing;
  /* One flag for "nothing here can act": mid-flight, or signed out. */
  const inert = pending || !live;
  const shown = preview ?? src;

  /* An object URL is a document-lifetime reference to a blob. Revoking it when
     it is replaced or the card unmounts is what stops an operator who tried
     four photographs from holding four decoded images until navigation. */
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  /**
   * ⚠ THE LOCAL PREVIEW STANDS DOWN ONCE THE SERVER HAS A REAL URL.
   *
   * `shown` prefers the preview, so without this the blob stays on screen for
   * the rest of the session even after the stored image is available — the
   * operator sees the right face either way, which is exactly why it would go
   * unnoticed while the decoded bitmap sits in memory and `next/image` never
   * gets a chance to serve the optimised variant.
   *
   * Keyed on `src`: the preview is cleared only when a DIFFERENT stored URL
   * arrives, which is the moment the upload has actually landed. The path is
   * random per upload, so a replacement always changes this value.
   */
  const [settled, setSettled] = useState(src);
  if (settled !== src) {
    setSettled(src);
    if (src && preview) setPreview(null);
  }

  const accept = useCallback(
    (file: File | undefined | null) => {
      if (!file || pending) return;
      setError(null);
      setPreparing(true);

      void (async () => {
        const prepared = await prepareAvatar(file);
        setPreparing(false);

        if (!prepared.ok) {
          setError(prepared.error);
          return;
        }

        /* The preview goes up immediately, before the upload finishes. The
           operator sees their own crop at once and the network catches up —
           and if it fails, the `router.refresh()` below puts the real one back
           rather than leaving an optimistic image that was never stored. */
        setPreview((current) => {
          if (current) URL.revokeObjectURL(current);
          return prepared.previewUrl;
        });

        const form = new FormData();
        form.append('avatar', prepared.file);

        startTransition(async () => {
          const result = await updateConsoleAvatar(form);
          if (result.ok) {
            toast({
              tone: 'success',
              title: 'Photo updated',
              description: `${readableBytes(prepared.bytes)} stored. It now appears in the sidebar, the top bar and the account menu.`,
            });
          } else {
            setError(result.error);
            setPreview((current) => {
              if (current) URL.revokeObjectURL(current);
              return null;
            });
          }
          router.refresh();
        });
      })();
    },
    [pending, router, toast],
  );

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeConsoleAvatar();
      if (result.ok) {
        setConfirmRemove(false);
        setPreview((current) => {
          if (current) URL.revokeObjectURL(current);
          return null;
        });
        toast({
          tone: 'success',
          title: 'Photo removed',
          description: 'Your initials are shown again everywhere your photo appeared.',
        });
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="flex flex-col gap-6 pb-6 sm:flex-row sm:items-start"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      {/*
        ⚠ THE WHOLE TILE IS THE DROP TARGET AND THE LABEL. A `<label>` wrapping
        a visually-hidden file input is the one arrangement that is genuinely
        clickable, genuinely focusable, genuinely keyboard-operable and
        genuinely announced — without reimplementing any of it. A `<div
        onClick={() => input.click()}>` is none of those four for anyone not
        using a mouse.
      */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!inert) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className="group relative grid size-[84px] shrink-0 cursor-pointer place-items-center rounded-full transition-all duration-200 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--border-focus)] overflow-hidden"
        style={{
          boxShadow: dragging ? '0 0 0 2px var(--blue-500)' : 'var(--shadow-sm)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--blue-50)',
          color: 'var(--blue-600)',
          cursor: inert ? (pending ? 'progress' : 'not-allowed') : 'pointer',
          opacity: live ? 1 : 0.72,
        }}
        aria-busy={pending || undefined}
        /* 17 §6.4: a control that cannot act says why, and the banner above
           carries the same sentence at full width. */
        title={live ? undefined : 'Sign in again to change your photo.'}
      >
        {shown ? (
          <Avatar src={shown} name={name} size={84} />
        ) : (
          <span className="font-ui text-[28px] font-medium leading-none" aria-hidden>
            {initials}
          </span>
        )}

        {/* The hover and focus affordance. Hidden from assistive tech — the
            label's own text below says what this does. */}
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-[color-mix(in_oklab,var(--ink-950)_55%,transparent)] opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
        >
          {shown ? (
            <IconCamera size={24} stroke={1.5} style={{ color: 'var(--text-inverse)' }} />
          ) : (
            <IconUpload size={24} stroke={1.5} style={{ color: 'var(--text-inverse)' }} />
          )}
        </span>

        {pending ? (
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center bg-[color-mix(in_oklab,var(--surface-raised)_80%,transparent)]"
          >
            <IconLoader2
              size={24}
              className="animate-spin text-[var(--blue-500)] motion-reduce:animate-none"
            />
          </span>
        ) : null}

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          className="sr-only"
          disabled={inert}
          onChange={(e) => {
            accept(e.target.files?.[0]);
            /* Reset, so choosing the SAME file twice fires `change` again —
               after a failed upload the obvious next action is to retry with
               the file already picked, and without this the input is already
               holding it and stays silent. */
            e.target.value = '';
          }}
        />
      </label>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
        <div
          className="text-[14px] leading-relaxed"
          style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
        >
          {src ? (
            <p>Your photo appears beside your name in the sidebar, the top bar and the account menu.</p>
          ) : (
            <>
              <p>Add a photo, or keep the initials generated from your name.</p>
              <p>Both appear beside you in the sidebar, the top bar and the account menu.</p>
            </>
          )}
        </div>
        <p className="text-[13px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
          {/* ⚠ THE PRIVACY LINE IS NOT MARKETING. The browser re-encodes the
              image before it is uploaded, which drops the EXIF block — and on
              a phone photograph that block contains the GPS coordinates of
              where it was taken. An operator is entitled to know that is
              handled, on the screen where they hand over the file. */}
          PNG, JPEG or WebP. Cropped to a square and resized in your browser, which also strips
          location and camera data before anything is uploaded.
        </p>

        {error ? (
          <p
            role="alert"
            className="t-caption mt-2 flex items-start gap-1.5"
            style={{ color: 'var(--danger-fg)', textWrap: 'pretty' }}
          >
            <IconAlertTriangle size={13} stroke={2} aria-hidden className="mt-px shrink-0" />
            <span className="min-w-0">{error}</span>
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/*
            ⚠ THE PRIMITIVE, NOT A HAND-ROLLED `<button>`. The front-end pass
            replaced this with a bare button carrying the same colours — which
            were correctly tokenised, so the look is unchanged — but a bare
            button has no disabled treatment, no `focus-visible` ring and no
            `motion-reduce` on its press animation. `Button` has all three, and
            this control is disabled in two different states, so the missing
            disabled styling was the one that showed.
          */}
          <Button
            variant="secondary"
            size="sm"
            icon={<IconUpload aria-hidden />}
            disabled={inert}
            title={live ? undefined : 'Sign in again to change your photo.'}
            onClick={() => inputRef.current?.click()}
          >
            {src ? 'Replace photo' : 'Upload photo'}
          </Button>

          {/* ⚠ ABSENT RATHER THAN DISABLED WHEN THERE IS NOTHING TO REMOVE. A
              greyed-out Remove beside an account that has no photo is a control
              that exists to be unusable, which is what this whole pass is for
              removing. */}
          {src ? (
            <Button
              variant="quiet"
              size="sm"
              icon={<IconTrash aria-hidden />}
              disabled={inert}
              title={live ? undefined : 'Sign in again to change your photo.'}
              onClick={() => setConfirmRemove(true)}
              style={{ color: 'var(--danger-fg)' }}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={(next) => {
          if (busy) return;
          setConfirmRemove(next);
          if (!next) setError(null);
        }}
        title="Remove your profile photo?"
        /* ⚠ IT SAYS THE FILE IS DELETED, BECAUSE THE FILE IS DELETED. There is
           no recycle bin behind this and no way to recover the image from the
           product — 03 §9 asks for one sentence naming the consequence, and
           "you can add another one" is not the consequence. */
        consequence={`The image is deleted from storage. ${name.split(' ')[0] ?? 'You'} will be shown as initials again, and the file cannot be recovered from here.`}
        details={
          <AuditNote>
            <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
              Recorded in the same transaction as the change:
            </p>
            <ul className="mt-1.5 grid gap-1">
              <AuditLine>
                this platform&rsquo;s audit log, as a profile change with your name against it
              </AuditLine>
              <AuditLine>
                the photo disappears from the sidebar, the top bar and the account menu at once
              </AuditLine>
            </ul>
          </AuditNote>
        }
        confirmLabel="Remove photo"
        tone="destructive"
        onConfirm={remove}
        loading={busy}
        error={error}
      />
    </div>
  );
}
