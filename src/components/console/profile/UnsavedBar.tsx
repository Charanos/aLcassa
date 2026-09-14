'use client';

import { useEffect } from 'react';
import { IconAlertTriangle, IconRotate } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';

/**
 * THE BAR THAT FOLLOWS YOU DOWN THE PAGE WHILE SOMETHING IS UNSAVED.
 *
 * ⚠ IT REPLACES A SAVE BUTTON THAT COULD BE SCROLLED OUT OF EXISTENCE.
 *
 * The identity card's Save sat in the card's own footer. The profile is four
 * cards tall, so an operator who edits their name, scrolls down to check a
 * device, and comes back has been out of sight of the only control that commits
 * the change — and the only indication anything was pending was a line of grey
 * text in the same footer. On a settings screen the commit control must be
 * reachable from wherever the reader currently is.
 *
 * ⚠ IT IS `sticky` AT THE BOTTOM OF THE PAGE, NOT `fixed`.
 *
 * `fixed` takes the bar out of flow and pins it to the viewport, where it
 * overlays the last card's content and needs page padding invented to
 * compensate. `sticky bottom-4` keeps it in flow at the end of the form: it
 * floats while there is page beneath it and comes to rest above the footer when
 * the reader reaches the end. Nothing is ever hidden behind it.
 *
 * ⚠ AND IT GUARDS THE TAB. `beforeunload` is the only hook a browser gives for
 * "you typed something and are about to lose it", and it is deliberately
 * limited — the browser shows its own wording, and only if the operator has
 * interacted with the page. That is enough for the case that actually happens:
 * a rename typed, a tab closed, a change silently lost with no error anywhere
 * because nothing failed.
 *
 * It is NOT a router guard. Next's App Router has no supported interception for
 * client navigation, and the workarounds — patching history, wrapping every
 * `<Link>` — break the back button in ways that are worse than the problem.
 * What in-app navigation does instead is unmount this component with the draft
 * still in memory, which is a real limitation and is recorded in 19 §6 rather
 * than papered over.
 */
export function UnsavedBar({
  dirty,
  pending,
  invalid,
  message,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  pending: boolean;
  /** The draft cannot be saved as it stands. Save is dead and says why. */
  invalid: boolean;
  /** What is wrong, when `invalid`. Otherwise the count of what will change. */
  message: string;
  onSave: () => void;
  onDiscard: () => void;
}) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      /* Every current browser shows its own fixed wording and ignores any
         string set here; assigning `returnValue` is still what arms the
         prompt in some of them. */
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return (
    <div
      className="pointer-events-none sticky bottom-4 z-20 flex justify-center px-2"
      /* The bar is announced when it appears, not when it changes: a live
         region on the whole thing would re-read the sentence on every
         keystroke that alters the character count. */
      role="region"
      aria-label="Unsaved changes"
      aria-hidden={!dirty}
    >
      <div
        className="pointer-events-auto relative w-full max-w-[600px] overflow-hidden rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{
          /* ⚠ THE CHROME TIER, NOT LITERALS. These were `#060913`,
             `rgba(255,255,255,0.08)` and a hand-mixed shadow — and `#060913` is
             exactly `--chrome-bg-base`, which is the giveaway: the bar was
             already reaching for the console's dark slab and re-typing its
             values. 03 §23: the chrome inverts against the PAGE, not against a
             theme, so a floating dark bar over a cream page is chrome and reads
             Tier 4. Now a change to the slab moves this with it. */
          background: 'var(--chrome-bg-base)',
          border: '1px solid var(--chrome-rule-strong)',
          boxShadow:
            'var(--shadow-lg), inset 0 1px 1px color-mix(in oklab, var(--ink-0) 6%, transparent)',
          /* Out of the way entirely when clean — no height, no hit region, no
             tab stop. `visibility: hidden` is what removes the buttons from the
             focus order; opacity and transform alone would leave them tabbable
             behind an invisible bar. */
          opacity: dirty ? 1 : 0,
          visibility: dirty ? 'visible' : 'hidden',
          transform: dirty ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.96)',
        }}
      >
        {/* ── Premium Ambient Background Art (Replicated from Overview Hero) ── */}
        <div className="pointer-events-none absolute inset-0 z-0 select-none" aria-hidden="true">
          {/* Deep atmospheric glows */}
          <div
            className="absolute -top-12 -left-12 h-[100px] w-[100px] rounded-full opacity-[0.25] blur-[30px]"
            style={{ background: 'var(--blue-500)' }}
          />
          <div
            className="absolute -bottom-12 -right-12 h-[140px] w-[140px] rounded-full opacity-[0.15] blur-[40px]"
            style={{ background: 'var(--indigo-500)' }}
          />

          {/* Minimalist dot matrix overlay */}
          <div
            className="absolute inset-0 opacity-[0.3]"
            style={{
              /* The dot itself is a token; the MASK is deliberately left as
                 opaque-to-transparent black, because a mask's colour is never
                 painted — only its alpha channel is read. Tokenising it would
                 imply a palette decision where none exists. */
              backgroundImage: `radial-gradient(color-mix(in oklab, var(--ink-0) 80%, transparent) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              maskImage: 'linear-gradient(135deg, #000 0%, transparent 80%)',
              WebkitMaskImage: 'linear-gradient(135deg, #000 0%, transparent 80%)',
            }}
          />
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 flex w-full items-center gap-4 py-2.5 pr-2.5 pl-5">
          <IconAlertTriangle
            size={18}
            stroke={2}
            aria-hidden
            className="shrink-0"
            style={{ color: invalid ? 'var(--red-400)' : 'var(--amber-400)' }}
          />
          <p
            className="t-body min-w-0 flex-1 truncate font-medium tracking-tight"
            style={{ color: 'var(--ink-0)' }}
            title={message}
          >
            {message}
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="quiet"
              size="sm"
              onClick={onDiscard}
              disabled={pending}
              icon={<IconRotate size={16} aria-hidden />}
              className="!rounded-full !text-[var(--ink-300)] font-medium hover:!bg-[color-mix(in_srgb,var(--ink-0)_10%,transparent)] hover:!text-[var(--ink-0)]"
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={pending || invalid}
              loading={pending}
              className="!rounded-full font-medium shadow-lg shadow-blue-500/20"
            >
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
