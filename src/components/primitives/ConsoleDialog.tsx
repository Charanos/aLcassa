'use client';

import { useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconAlertTriangle, IconX, type Icon as TablerIcon } from '@tabler/icons-react';
import { IconTile, type IconTileTone } from './IconTile';
import { gsapSafe } from '@/lib/motion';

/**
 * THE CONSOLE'S MODAL, ONCE.
 *
 * ⚠ EXTRACTED FROM `StartSessionDialog`, WHICH WAS THE ONLY ONE THAT LOOKED
 *   RIGHT — AND THE OTHER FOUR WERE HAND-ROLLED APPROXIMATIONS OF IT.
 *
 * The support-session dialog established a real vocabulary: a mono eyebrow over
 * the title, one sentence of description, a hairline-separated list of facts,
 * one padding rhythm, and a footer on sunken ground. Every dialog written
 * after it copied some of that and improvised the rest, which is how four
 * modals ended up with four paddings, three title sizes and two footer grounds.
 *
 * Four deliberate departures from the original, all of them corrections:
 *
 * ⚠ 1 · THE TITLE IS NOT `display display-md`. At 38px "Enter Kilimanjaro
 * Logistics Group Ltd" wrapped to three lines and ate half the panel before a
 * word of content. A dialog title is a label on a task, not a page heading —
 * `display-sm` at weight 500 keeps the editorial voice and gives the content
 * back its room.
 *
 * ⚠ 2 · WIDTH IS A PROP, AND IT IS GENEROUS. The instinct to keep a modal
 * narrow is right for a confirmation and wrong for a form: the rules editor has
 * six prose fields, and cramming them into 560px produced a column of
 * three-word lines that read like a receipt. Size the dialog to its content —
 * `md` for a question, `xl` for a document.
 *
 * ⚠ 3 · CENTRING IS ON A WRAPPER, NEVER ON A TRANSFORM. `panel-in` ends at
 * `transform: none` and the reduced-motion rule forces it with `!important`;
 * GSAP writes an inline transform that REPLACES the centring classes outright.
 * Three dialogs rendered with their top-left corner at the middle of the
 * screen because of this. The grid wrapper owns position, the panel owns
 * transform, and nothing added later can decentre it. 17 §14.
 *
 * ⚠ 4 · THE FOOTER DOES NOT PRINT THE OPERATION KEY. See the `operation` prop.
 */

const WIDTHS = {
  /** A question with one control. */
  sm: 480,
  /** A confirmation with consequences, or a short form. */
  md: 600,
  /** A form with a preview, a list, or two columns of facts. */
  lg: 760,
  /** A document. Six prose fields, a comparison, a long record. */
  xl: 940,
} as const;

export type ConsoleDialogWidth = keyof typeof WIDTHS;

export function ConsoleDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  width = 'md',
  operation,
  facts,
  error,
  actions,
  children,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mono, uppercase, above the title. The KIND of thing this is. */
  eyebrow: string;
  title: string;
  /** One sentence. What confirming actually does. 03 §9. */
  description?: React.ReactNode;
  width?: ConsoleDialogWidth;
  /**
   * The operation's real name — `support_session.start`, `plan.limit_changed`.
   *
   * ⚠ IT IS NO LONGER PRINTED IN THE FOOTER, AND THAT WAS THE RIGHT CALL.
   *
   * The original argument for showing it was that an operator about to do
   * something audited should be able to read the string they will later search
   * the log for. That reasoning holds for an internal tool and fails for this
   * one: the console is put in front of clients, and every dialog opened in
   * front of them carried a snake_case key along its bottom edge — which reads
   * as a debug affordance left switched on, not as a considered detail. The
   * operator who genuinely needs the key is looking at the audit log, where it
   * is a column.
   *
   * It stays in the API and lands on the panel as `data-operation`, so the key
   * is still discoverable by anyone inspecting the DOM and still names the
   * dialog for a test — without being typography.
   */
  operation?: string;
  /** The hairline-separated fact list. Use `DialogFact`. */
  facts?: React.ReactNode;
  error?: string | null;
  actions: React.ReactNode;
  children?: React.ReactNode;
  /** False while a write is in flight, so Escape cannot orphan it. */
  dismissible?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * ⚠ A REF AND AN EFFECT, NOT AN INLINE CALLBACK REF.
   *
   * React re-invokes a callback ref whenever its identity changes, and an
   * inline arrow is a fresh function every render — so every dialog written
   * this way replayed its entrance animation on every keystroke in its own
   * form. `StartSessionDialog` still does it; converting it here fixes it
   * there too.
   */
  useEffect(() => {
    if (!open || !panelRef.current) return;
    gsapSafe.fromTo(
      panelRef.current,
      { opacity: 0, y: 14, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.32,
        ease: 'power3.out',
        clearProps: 'transform',
      },
    );
  }, [open]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!dismissible && !next) return;
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[150]"
          style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(6px)' }}
        />
        <div className="pointer-events-none fixed inset-0 z-[150] grid place-items-center p-4">
          <Dialog.Content
            ref={panelRef}
            data-operation={operation}
            className="surface-glass-strong pointer-events-auto flex max-h-[88vh] w-full flex-col overflow-hidden rounded-overlay"
            style={{
              maxWidth: WIDTHS[width],
              boxShadow: 'var(--glass-highlight), var(--shadow-lg)',
            }}
          >
            {/* ── Head ──────────────────────────────────────────────────── */}
            <div className="shrink-0 px-6 pt-6 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                    {eyebrow}
                  </p>
                  <Dialog.Title asChild>
                    {/* display-sm, not display-md. See note 1 above. */}
                    <h2
                      className="display display-sm mt-2 tracking-tight"
                      style={{ color: 'var(--text-primary)', fontWeight: 500, textWrap: 'balance' }}
                    >
                      {title}
                    </h2>
                  </Dialog.Title>
                </div>
                {dismissible ? (
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-[var(--surface-inset)]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <IconX size={16} stroke={1.5} />
                    </button>
                  </Dialog.Close>
                ) : null}
              </div>

              {description ? (
                <Dialog.Description asChild>
                  <p
                    className="t-body mt-3"
                    style={{
                      color: 'var(--text-secondary)',
                      maxWidth: '62ch',
                      textWrap: 'pretty',
                    }}
                  >
                    {description}
                  </p>
                </Dialog.Description>
              ) : null}

              {facts ? (
                <ul
                  className="mt-4 grid list-none gap-2.5 border-t p-0 pt-4"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  {facts}
                </ul>
              ) : null}
            </div>

            {/* ── Body ──────────────────────────────────────────────────────
                Scrolls on its own, so a tall form never pushes the footer off
                the screen and the actions stay reachable at any height. */}
            {children ? (
              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-6 pb-5">
                {children}
              </div>
            ) : null}

            {error ? (
              <div className="shrink-0 px-6 pb-4">
                <p
                  role="alert"
                  className="t-compact flex items-start gap-2 rounded-panel px-3.5 py-2.5"
                  style={{
                    background: 'var(--badge-danger-bg)',
                    border: '1px solid var(--badge-danger-edge)',
                    color: 'var(--danger-fg)',
                    textWrap: 'pretty',
                  }}
                >
                  <IconAlertTriangle
                    size={15}
                    stroke={1.5}
                    className="mt-px shrink-0"
                    aria-hidden
                  />
                  {error}
                </p>
              </div>
            ) : null}

            {/* ── Foot ──────────────────────────────────────────────────────
                Right-aligned, because there is no longer anything on the left.
                `justify-end` rather than a spacer element: an empty flex child
                holding a gap open is the kind of thing that survives three
                refactors and nobody can explain. */}
            <div
              className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t px-6 py-3.5"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
            >
              {actions}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * One line in the head's fact list: a glyph, then a sentence.
 *
 * ⚠ THE GLYPH IS AN `IconTile`, NOT A BARE STROKE.
 *
 * A 16px Tabler outline sitting directly on the panel is flat — it reads as
 * part of the text run rather than as a marker beside it, and at three facts in
 * a column the eye has nothing to anchor on. `IconTile` is the treatment the
 * demo doors use and the reason they look finished: a light-to-dark gradient, a
 * hairline, and a small shadow, so the glyph sits ON the surface instead of in
 * it. Two ink steps rather than an elevation, which is what keeps it from
 * competing with the dialog's own lift.
 *
 * `sm` — 28px. Large enough to carry the raised treatment, small enough that a
 * three-line fact still reads as one paragraph rather than as a card.
 */
export function DialogFact({
  icon,
  tone = 'neutral',
  children,
}: {
  icon: TablerIcon;
  /** Only where the fact IS a warning. A tinted tile on a neutral clause is
   *  the misuse `IconTile`'s own documentation names. */
  tone?: IconTileTone;
  children: React.ReactNode;
}) {
  return (
    <li className="t-compact flex items-start gap-3" style={{ color: 'var(--text-primary)' }}>
      <IconTile icon={icon} size="sm" tone={tone} className="mt-px" />
      <span className="min-w-0 pt-1" style={{ textWrap: 'pretty' }}>
        {children}
      </span>
    </li>
  );
}

/**
 * The two buttons every dialog ends with.
 *
 * ⚠ ONE HEIGHT AND ONE RADIUS, BECAUSE FOUR DIALOGS HAD THREE OF EACH — 34px
 * here, 36 there, 40 in the plan card, with `rounded-overlay`, `rounded-panel` and
 * `rounded-full` between them. Nobody notices one dialog's buttons; everybody
 * notices that the console does not agree with itself.
 */
export function DialogActions({
  cancelLabel = 'Cancel',
  confirmLabel,
  confirmIcon: ConfirmIcon,
  onConfirm,
  disabled,
  loading,
  tone = 'primary',
}: {
  cancelLabel?: string;
  confirmLabel: string;
  confirmIcon?: React.ComponentType<{ size?: number; stroke?: number }>;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'destructive';
}) {
  const ready = !disabled && !loading;
  return (
    <>
      <Dialog.Close asChild>
        <button
          type="button"
          disabled={loading}
          className="t-compact rounded-panel px-3.5 transition-colors hover:bg-[var(--surface-inset)]"
          style={{
            height: 36,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
          }}
        >
          {cancelLabel}
        </button>
      </Dialog.Close>
      <button
        type="button"
        onClick={onConfirm}
        disabled={!ready}
        className="t-compact inline-flex items-center gap-2 rounded-panel px-4 transition-all"
        style={{
          height: 36,
          border: 'none',
          background: ready
            ? tone === 'destructive'
              ? 'var(--danger-fg)'
              : 'var(--blue-500)'
            : 'var(--surface-inset)',
          color: ready ? 'var(--text-inverse)' : 'var(--text-disabled)',
          fontWeight: 500,
          cursor: ready ? 'pointer' : 'not-allowed',
        }}
      >
        {ConfirmIcon && !loading ? <ConfirmIcon size={15} stroke={1.5} /> : null}
        {loading ? 'Working…' : confirmLabel}
      </button>
    </>
  );
}
