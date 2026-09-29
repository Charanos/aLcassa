import React from 'react';
import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';

/**
 * The console's surface vocabulary.
 *
 * Every screen under `/platform` composes from these four, so a change to how
 * a panel is drawn lands everywhere at once rather than in thirteen files.
 *
 * ⚠ WHY THESE ARE NOT `components/presentation/Sheet.tsx`.
 *
 * The tracker's `Panel` is built for a document being read a handful of times
 * in a meeting: generous padding, a coloured neumorphic tone shadow, a title
 * that can wrap. The console is the opposite reading task — someone lives in
 * it for eight hours and scans it — so these are tighter, quieter, and carry
 * their heading in a fixed-height bar that a row of panels can align against.
 *
 * They are also SERVER components with no `'use client'`, which is what lets a
 * console page stay server-rendered while sitting inside the client shell.
 */

/**
 * The page frame. One max-width and one padding rhythm for all thirteen
 * screens, so switching between them never shifts the content edge.
 */
export function ConsolePage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto w-full max-w-[1380px] overflow-x-clip px-5 pt-8 pb-16 md:px-8 md:pt-10 xl:max-w-[1600px] 2xl:max-w-[1760px]"
      style={{
        color: 'var(--text-primary)',
        /* Same inert-utility fix as the mobile sheet: `animate-in fade-in
           slide-in-from-bottom-3` comes from tailwindcss-animate, which this
           project does not install, so every console page was arriving with
           no transition at all while appearing to ask for one. */
        animation: 'slide-up-fade var(--duration-slow) var(--ease-out)',
      }}
    >
      {children}
    </div>
  );
}

import { IconChevronRight } from '@tabler/icons-react';

/**
 * The greeting block at the top of a console screen: a mono eyebrow carrying
 * machine facts (a timestamp, a count, a version) over a serif title.
 *
 * The eyebrow is where the console puts things a person checks rather than
 * reads. Keeping it mono means a timestamp never re-flows the title beside it.
 */
export function ConsoleHeader({
  eyebrow,
  breadcrumbs,
  title,
  actions,
  rule,
}: {
  eyebrow?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  title: string;
  actions?: React.ReactNode;
  /**
   * A hairline directly beneath the header, for the screens that want one.
   *
   * ⚠ IT REPLACES A WRAPPER THAT WAS PUTTING THE RULE IN THE WRONG PLACE.
   *
   * Three pages — profile, settings, support sessions — each wrapped this
   * component in `<div className="border-b pb-5">` and then added `mt-6` below
   * it. Since the header carries its own `mb-10`, the result was: title, forty
   * pixels of air, a hairline, twenty-four more pixels, content. The rule ended
   * up floating in the middle of an eighty-pixel gap, attached to nothing,
   * rather than closing the header.
   *
   * With `rule` the margin collapses into the rule's own spacing and the
   * hairline sits where a hairline under a heading belongs. The other two pages
   * drop their wrapper when their pass comes round.
   */
  rule?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8 ${
        rule ? 'mb-6 border-b pb-5' : 'mb-10'
      }`}
      style={rule ? { borderColor: 'var(--border-subtle)' } : undefined}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-4 -ml-2.5 flex items-center gap-1.5">
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={i}>
                {bc.href ? (
                  <a
                    href={bc.href}
                    className="rounded-full px-2.5 py-1 font-mono text-2xs font-medium tracking-widest uppercase transition-all duration-200 hover:bg-[var(--chrome-hover)] hover:text-[var(--text-primary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {bc.label}
                  </a>
                ) : (
                  <span
                    className="rounded-full bg-[var(--chrome-hover)] px-2.5 py-1 font-mono text-2xs font-medium tracking-widest uppercase shadow-[var(--chrome-highlight)] ring-1 ring-[var(--chrome-rule)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {bc.label}
                  </span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <IconChevronRight
                    size={12}
                    stroke={2.5}
                    className="opacity-30"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}

        {eyebrow && (
          <p
            className="mb-2 font-mono text-2xs font-medium tracking-[0.2em] uppercase"
            style={{ color: 'var(--text-secondary)', opacity: 0.8 }}
          >
            {eyebrow}
          </p>
        )}
        {/* greeting h1 uses display-sm: 24px — editorial but not hero-sized */}
        <h1
          className="display display-md tracking-tight"
          style={{
            color: 'var(--text-primary)',
            textShadow: '0 2px 10px color-mix(in oklab, var(--ink-950) 15%, transparent)',
          }}
        >
          {title}
        </h1>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}

/**
 * A section heading with a rule that fills the space between the title and an
 * optional note.
 *
 * The rule is doing real work: it ties a heading to the full width of the
 * content beneath it, which is what stops a short title from looking
 * unmoored above a wide table. 03 §4a lists the hairline as a hierarchy tool
 * precisely for this.
 */
export function SectionHeading({
  title,
  note,
  action,
  align = 'left',
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const isRight = align === 'right';

  return (
    <div className="mt-24 mb-12 w-full">
      {/* Top Hairline spanning full width */}
      <div
        className={`mb-6 h-px w-full ${
          isRight
            ? 'bg-gradient-to-l from-[var(--border-strong)]/40 via-[var(--border-strong)]/10 to-transparent'
            : 'bg-gradient-to-r from-[var(--border-strong)]/40 via-[var(--border-strong)]/10 to-transparent'
        }`}
        aria-hidden
      />

      <div
        className={`flex w-full items-start justify-between gap-8 ${isRight ? 'flex-row-reverse' : ''}`}
      >
        {/* Main Content Stack */}
        <div
          className={`flex flex-col ${isRight ? 'items-end text-right' : 'items-start text-left'}`}
        >
          <h2
            className="display display-md tracking-tight"
            style={{ color: 'var(--text-primary)', fontWeight: 400 }}
          >
            {title}
          </h2>
          {note ? (
            <p className="t-body mt-2.5" style={{ color: 'var(--text-secondary)' }}>
              {note}
            </p>
          ) : null}
        </div>

        {/* Action Link */}
        {action ? <div className="mt-1 shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * THE CONSOLE SECTION. Three variants, and the choice between them is a design
 * decision rather than a styling one.
 *
 * ⚠ THIS COMMENT USED TO READ "the uncarded console section · replaces the
 * traditional nested white card", AND THE PRODUCT HAD STOPPED AGREEING WITH IT.
 *
 * The console was first built uncarded: sections separated by a hairline rule
 * and whitespace, content breathing directly on the page. That was the right
 * instinct for a dense operator screen and it is still the right default — it
 * is what `default` does.
 *
 * It stopped being right for the OVERVIEW specifically, and for one reason: the
 * overview is not one dense screen, it is **five bands of unrelated subjects**
 * stacked vertically — a queue, a telemetry rail, revenue, portfolio,
 * operations. Uncarded, a reader scrolling it cannot tell where revenue ends
 * and portfolio begins, because a hairline between two sections looks exactly
 * like a hairline inside one. Carding gives each band a boundary that survives
 * scrolling, which is what a briefing screen needs and a working screen does
 * not.
 *
 *   `default`      uncarded. A hairline above, content on the page ground.
 *                  The right choice on a single-subject working screen —
 *                  Workspaces, Audit, Plans — where the page IS the panel.
 *
 *   `elevated`     carded. Rounded, sunken ground, its own padding. The right
 *                  choice where unrelated subjects sit side by side or stack,
 *                  which is the overview and nothing else so far.
 *
 *   `flush-glass`  the carded SHAPE with no ground, for a panel that sits on a
 *                  surface already tinted — nesting a sunken card inside a
 *                  sunken well produces a second edge that means nothing.
 *
 * ⚠ THE TWO ARE NOT INTERCHANGEABLE AND MUST NOT BE MIXED WITHIN ONE BAND. A
 * carded panel beside an uncarded one reads as one of them having failed to
 * render. Pick per band, not per panel. `03 §26`.
 */
export function Panel({
  title,
  action,
  children,
  flush,
  accent,
  variant = 'default',
  /**
   * Under the body: the reason a control in the header is dead, a note, an
   * error.
   *
   * ⚠ THIS IS NOT THE STANDFIRST THIS COMPONENT REFUSES. The paragraph below
   * explains why a band's TITLE cannot take a sentence — a band that needs one
   * to be understood has a visualisation that failed, and the fix is the
   * visualisation. A footer is the opposite case: the band reads fine, and
   * something in it is INERT. 17 §6.4 requires that reason to be on the
   * surface, and `InertControl` says the same in its own words. A tooltip is
   * not a surface, so the band needs somewhere to say it.
   */
  footer,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  accent?: 'live' | 'warning' | 'danger';
  variant?: 'default' | 'elevated' | 'flush-glass';
  footer?: React.ReactNode;
}) {
  const accentInk =
    accent === 'danger'
      ? 'var(--danger-fg)'
      : accent === 'warning'
        ? 'var(--warning-fg)'
        : accent === 'live'
          ? 'var(--blue-500)'
          : undefined;

  const isElevated = variant === 'elevated';
  const isFlushGlass = variant === 'flush-glass';

  return (
    <section
      className={`group relative flex flex-col ${isElevated || isFlushGlass ? 'rounded-card px-5 py-4' : 'pt-1'} transition-all duration-400`}
      style={
        isElevated || isFlushGlass
          ? {
              background: isElevated ? 'var(--surface-sunken)' : 'transparent',
              boxShadow: 'var(--glass-highlight)',
            }
          : undefined
      }
    >
      {/* Top Hairline Separator (only for default variant) */}
      {variant === 'default' && (
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[var(--border-subtle)] to-transparent"
          aria-hidden
        />
      )}
      {title ? (
        <div
          className={`mb-5 ${isElevated || isFlushGlass ? '' : 'mt-4'} flex items-center justify-between gap-4 px-1`}
        >
          <div className="flex items-center gap-2.5">
            {accentInk ? (
              <span className="relative flex size-2 shrink-0 items-center justify-center">
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-full opacity-40"
                  style={{ background: accentInk, animationDuration: '3s' }}
                />
                <span
                  aria-hidden
                  className="relative size-1.5 rounded-full"
                  style={{ background: accentInk }}
                />
              </span>
            ) : null}
            <h3
              className="font-mono text-sm font-medium tracking-[0.15em] uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {title}
            </h3>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={`${flush ? '' : 'px-1'} flex min-h-0 flex-1 flex-col`}>{children}</div>
      {/* `mt-auto` so a footer in a band stretched by a taller sibling in the
          same grid row still sits at the bottom, rather than floating under
          short content with a gap beneath it. */}
      {footer ? (
        <div className={`mt-auto pt-4 ${flush ? 'px-5 pb-1' : 'px-1'}`}>{footer}</div>
      ) : null}
    </section>
  );
}

/**
 * THE SECTION ON A SCREEN THE OPERATOR CAME TO CHANGE SOMETHING ON.
 *
 * ⚠ WHY THIS IS NOT `Panel variant="elevated"`, WHICH IS ALSO A CARD.
 *
 * They are the same shape doing two different jobs, and the difference is in
 * the heading. `Panel` titles a BAND on a briefing screen: a mono eyebrow,
 * uppercase, tracked out — a label on a region somebody is scanning. It has
 * nowhere to put a sentence, deliberately, because a band that needs a sentence
 * of explanation is a band whose visualisation has failed.
 *
 * A settings section is the opposite reading task. Nobody scans it; they arrive
 * looking for one control, and the sentence under the heading is what tells
 * them whether this is the section that holds it — "Devices currently signed
 * into this account" is doing more work than the word "Sessions" above it.
 *
 * Bending `Panel` to carry a standfirst would have given it two title
 * treatments and no rule for choosing between them. Two named components with
 * one sentence each is cheaper than one component with a mode.
 *
 * ⚠ USE IT ON: profile, settings, admin detail — anywhere the page is a form.
 *    USE `Panel` ON: overview and the dashboards, where the page is a briefing.
 *    03 §26 still decides carded-vs-uncarded; this decides WHICH card.
 *
 * ⚠ THIRTEEN HAND-ROLLED COPIES OF THIS EXIST TODAY — four on the profile,
 * eight in `SettingsPanel`, one in the sessions view — each with its own
 * padding, radius and shadow, several with raw `#ffffff` grounds. The profile
 * is the first consumer; settings adopts it in its own pass, and that pass is
 * then a deletion rather than a redesign.
 */
export function SettingsSection({
  /**
   * ⚠ OPTIONAL, BECAUSE A SECTION CAN HAVE ITS HEADING ELSEWHERE.
   *
   * The profile's identity card leads with the avatar and takes its heading from
   * the page above it, so it passes nothing. It previously passed `title=""`,
   * which is worse than passing nothing: it emitted an empty `<h2>` into the
   * document outline, so a screen reader's heading list gained a blank entry and
   * the card reserved the header's padding for no content.
   *
   * A section with no title is still a card. §26 rule 3 — "a card needs a title"
   * — is about a card that BELONGS to no named region, and this one is named by
   * the heading immediately above it.
   */
  title,
  standfirst,
  action,
  children,
  /**
   * Rows that draw their own dividers and need to meet the card's edge — a
   * list, a table. The header keeps its padding; the body loses the horizontal
   * inset so a divider can run the full width. Without this, a `divide-y` list
   * inside a padded card produces rules that stop short of the border and read
   * as a rendering fault.
   */
  flush,
  /** Sits under the body, above the card's bottom edge: an error, a note. */
  footer,
}: {
  title?: string;
  standfirst?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <section
      className="overflow-hidden rounded-overlay"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm), var(--glass-highlight)',
      }}
    >
      {title || standfirst || action ? (
        <div
          className={`flex items-start justify-between gap-4 px-5 pt-5 ${flush ? 'pb-4' : 'pb-0'}`}
          style={flush ? { borderBottom: '1px solid var(--border-subtle)' } : undefined}
        >
          <div className="min-w-0">
            {/* 15px medium. Above the body text, below the page title, and under
                the weight ceiling of 500 that 03 §5 sets for the whole console. */}
            {title ? (
              <h2
                className="text-md"
                style={{ color: 'var(--text-primary)', fontWeight: 500, letterSpacing: '-0.01em' }}
              >
                {title}
              </h2>
            ) : null}
            {standfirst ? (
              <p
                className="t-compact mt-1"
                style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
              >
                {standfirst}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      <div className={flush ? '' : 'px-5 pt-5 pb-5'}>{children}</div>

      {footer ? (
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/**
 * A sleek, typography-first row for metrics.
 * Drops the pulsing dots in favor of clean layout and premium font weights.
 */
export function FactRow({
  label,
  value,
  dot,
  tone,
  last,
}: {
  label: string;
  value: string;
  dot?: 'ok' | 'warn' | 'bad';
  tone?: 'default' | 'warn';
  last?: boolean;
}) {
  const dotInk =
    dot === 'bad' ? 'var(--danger-fg)' : dot === 'warn' ? 'var(--warning-fg)' : 'var(--success-fg)';

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-panel px-2 py-2.5 transition-colors duration-200 hover:bg-[var(--surface-inset)]/50"
      style={{
        borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {dot ? (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{
              background: dotInk,
              boxShadow: `0 0 6px ${dotInk}`,
            }}
          />
        ) : null}
        <span
          className="truncate"
          style={{
            font: '400 13px/1.5 var(--font-ui)',
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </span>
      </div>
      <span
        className="numeric shrink-0 whitespace-nowrap"
        style={{
          font: '500 13px/1 var(--font-mono)',
          color: tone === 'warn' ? 'var(--warning-fg)' : 'var(--text-secondary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * The console's one download control. 17 §6.1.
 *
 * ⚠ IT IS AN ANCHOR, NOT A BUTTON, AND THAT IS THE WHOLE REASON IT WORKS.
 *
 * Four screens carried a `<button>` labelled Export that did nothing. Replacing
 * the handler would have meant a client component, a fetch, a blob and an
 * object URL on four otherwise server-rendered pages. A link to a route that
 * answers with `Content-Disposition: attachment` is what a browser already
 * does, needs no JavaScript, and survives middle-click and "save link as".
 *
 * It keeps the button's exact geometry so the row it sits in does not move.
 */
export function ExportLink({
  resource,
  className,
  children,
}: {
  resource: 'workspaces' | 'revenue' | 'audit';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`/api/platform/export/${resource}`}
      className={
        className ??
        't-compact inline-flex h-[34px] shrink-0 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]'
      }
      style={
        className
          ? undefined
          : {
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
            }
      }
    >
      {children}
    </a>
  );
}

/**
 * A control whose backing does not exist in Phase 1.
 *
 * ⚠ THE REASON IS ON THE SURFACE, NOT IN A TOOLTIP.
 *
 * 17 §6.4: every control resolves to wired, disabled with a stated reason, or
 * removed. This is the middle one, and the stated reason is the part that
 * makes it acceptable — a greyed-out button with no explanation is a dead
 * control that has also stopped admitting it.
 *
 * `title` carries the reason for a pointer, `aria-describedby` would need an
 * id per instance, so the reason is also rendered as text beside or beneath
 * the control by the caller. This component refuses to be the only carrier.
 */
export function InertControl({
  reason,
  className,
  children,
}: {
  reason: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled
      title={reason}
      className={
        className ??
        't-compact inline-flex h-[34px] shrink-0 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap'
      }
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-sunken)',
        color: 'var(--text-disabled)',
        cursor: 'not-allowed',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Why a control is dead, at full width, in the row it belongs to.
 *
 * ⚠ `InertControl` PUTS THE REASON IN `title=`, AND ITS OWN DOCUMENTATION SAYS
 * THAT IS NOT ENOUGH: "the reason is also rendered as text beside or beneath
 * the control by the caller. This component refuses to be the only carrier."
 *
 * The profile was the first caller that did not, and the tenant tabs were the
 * next ten: controls shipped greyed out with their explanation reachable only
 * by hovering a mouse, so a keyboard or touch reader got a dead button and no
 * account of why. That is 17 §6.4 failed.
 *
 * ⚠ ONE NOTE PER GROUP, NOT ONE PER BUTTON. The ten inert controls across the
 * tenant tabs carry three reasons between them — Phase 2 has no channel
 * runtime, Phase 1 has no payment gateway, and anything reaching inside a
 * workspace needs a logged support session. Repeating a sentence beside every
 * button is noise a reader learns to skip, which fails the same requirement a
 * second way. State it once, beside the group it governs, and say what to do
 * INSTEAD — a reader who learns a button is dead and nothing else has been
 * told half of it.
 */
export function ReasonNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="t-caption flex gap-2 rounded-panel px-3 py-2"
      style={{
        background: 'var(--surface-sunken)',
        color: 'var(--text-tertiary)',
        textWrap: 'pretty',
      }}
    >
      <span aria-hidden style={{ color: 'var(--text-disabled)' }}>
        ·
      </span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * The link that ends a band.
 *
 * ⚠ A BAND WITHOUT ONE IS DECORATION. The pattern the overview established and
 * every other console surface now follows: a band is a QUESTION, a
 * visualisation that answers it, and a route to the screen that owns the
 * follow-up. A reader who finishes a band and has nowhere to go has been shown
 * a fact rather than given a handle on it.
 *
 * It lives here rather than in one surface's folder because it is surface
 * vocabulary — `overview/shared.tsx` re-exports it so the bands built against
 * that path keep working, and there is still exactly one definition.
 */
export function BandLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative flex h-[34px] items-center gap-2 overflow-hidden rounded-full px-4 transition-all duration-300 hover:bg-[var(--surface-sunken)]"
      style={{
        background: 'transparent',
        border: '1px solid color-mix(in srgb, var(--border-subtle) 80%, transparent)',
        color: 'var(--text-primary)',
        font: '500 13px/1 var(--font-ui)',
        boxShadow: 'var(--shadow-sm), var(--glass-highlight)',
      }}
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-[var(--blue-500)]">
        {children}
      </span>
      <IconArrowRight
        size={14}
        stroke={2}
        className="relative z-10 opacity-70 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--blue-500)] group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}
