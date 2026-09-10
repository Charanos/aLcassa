import Link from 'next/link';
import {
  IconArrowLeft,
  IconHexagon,
  IconTriangleSquareCircle,
  IconLayersIntersect,
  IconCube,
} from '@tabler/icons-react';
import { Wordmark } from '@/components/brand/Mark';
import { PlatformAside, TenantAside } from './AuthAside';

export { PlatformAside, TenantAside };

/**
 * The shell every access page renders inside: fixed header, fixed compliance
 * footer, and a centred card between them.
 *
 * ⚠ THE OLD DESCRIPTION OF THIS FILE SAID IT WAS "ENGINEERED TO FIT WITHIN
 * THE VIEWPORT WITHOUT VERTICAL SCROLLING ON DESKTOP", AND THAT SENTENCE WAS
 * THE BUG. It was not a description, it was an assumption — and the CSS
 * enforced it by clipping (`lg:overflow-hidden` with no scroll anywhere), so
 * any card taller than the viewport lost its bottom. Fitting is a property of
 * the CONTENT, which varies: registration is twice the height of
 * forgot-password, and the password meter grows as you type. The frame is
 * pinned to the viewport and the middle scrolls when it must — a card that
 * fits still never shows a scrollbar, and one that does not stays reachable.
 *
 * Layout: one column by default; two when `aside` is supplied, stacking below
 * `lg` with the form first.
 */
export function AuthShell({
  title,
  lede,
  children,
  footer,
  aside,
  cardMaxWidth = 'max-w-[540px]',
}: {
  title: string;
  lede?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * ⚠ THIS PROP WAS DECLARED AND NEVER RENDERED. It sat in the type for long
   * enough that six pages imported a pair of `TenantAside`/`PlatformAside`
   * components that returned `null`, passed them nowhere, and nobody noticed
   * because the shell dropped them anyway.
   *
   * It is real now, and it earns the width: a column beside the form for
   * context that the form itself cannot carry — on registration, the
   * onboarding path the reader is about to walk. Omit it and the card stays
   * the single centred column every other access page uses.
   */
  aside?: React.ReactNode;
  cardMaxWidth?: string;
}) {
  const twoColumn = Boolean(aside);

  /*
   * ⚠ `dvh`, NOT `vh`. On mobile Safari and Chrome the visual viewport
   * shrinks as the URL bar retracts; `100vh` is the LARGE viewport, so a
   * `min-h-screen` page reliably hides its own last ~60px behind the browser
   * chrome. `dvh` tracks the live height.
   *
   * ⚠ THE FRAME IS FIXED AND THE MIDDLE SCROLLS — `main` owns the overflow,
   * not this element. It used to be `lg:overflow-hidden` here with
   * `lg:overflow-visible` on `main`, which meant that on a large screen
   * anything taller than the viewport was CLIPPED WITH NO WAY TO REACH IT.
   * That was survivable while every card was short, and stopped being
   * survivable the moment registration grew a live password meter and a
   * second column: a reader on a 720px-tall laptop would have lost the submit
   * button. Header and footer stay put; the card scrolls.
   */
  return (
    <div className="relative flex min-h-dvh flex-col justify-between overflow-hidden bg-[var(--surface-base)] text-left selection:bg-[var(--blue-500)]/15 lg:h-dvh lg:max-h-dvh">
      {/* ── Top Header Navigation Bar (Clean: No pulsing badges) ── */}
      <header className="shrink-0 z-30 w-full border-b border-[var(--ink-200)]/70 bg-white/85 px-6 sm:px-10 py-3 backdrop-blur-md transition-colors">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Brand Wordmark & Back Affordance */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              aria-label="Back to aLcassa homepage"
              className="inline-flex items-center gap-2 rounded-lg transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
            >
              <Wordmark size={22} />
            </Link>

            <span className="text-[var(--ink-300)]" aria-hidden="true">
              |
            </span>

            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <IconArrowLeft
                size={13}
                className="transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
              <span>Back to home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Canvas: Centered Elevated Enclave ──
          `min-h-0` is what lets a flex child actually shrink and scroll —
          without it the default `min-height: auto` makes this box grow to its
          content, and the overflow escapes the frame instead of scrolling
          inside it. */}
      <main
        id="main"
        className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-4 sm:py-6"
      >
        {/* ── Ambient Atmospheric Background & Creative Watermark Icons ── */}
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
          aria-hidden="true"
        >
          {/* Soft ambient lighting orbs */}
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[650px] rounded-full opacity-[0.20] blur-[130px]"
            style={{
              background: 'radial-gradient(circle, var(--ink-300) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-10 right-1/4 size-[550px] rounded-full opacity-[0.12] blur-[120px]"
            style={{
              background: 'radial-gradient(circle, var(--orange-400) 0%, transparent 70%)',
            }}
          />

          {/* Architectural Blueprint SVG Curves */}
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.035]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
          >
            <defs>
              <linearGradient id="auth-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--ink-900)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--ink-400)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M -100 140 C 300 260, 750 0, 1300 200 C 1700 320, 2000 120, 2400 260"
              stroke="url(#auth-grad-1)"
              strokeWidth="1.2"
            />
            <path
              d="M -100 320 C 350 460, 700 80, 1350 340 C 1750 480, 2050 200, 2400 400"
              stroke="url(#auth-grad-1)"
              strokeWidth="0.8"
            />
            <ellipse cx="20%" cy="35%" rx="480" ry="260" stroke="url(#auth-grad-1)" strokeWidth="0.75" />
            <ellipse cx="80%" cy="75%" rx="440" ry="220" stroke="url(#auth-grad-1)" strokeWidth="0.75" />
          </svg>

          {/* Geometric Abstract Watermarks for Premium Technical Vibe */}
          <div className="absolute top-[10%] -right-24 hidden lg:block rotate-[15deg] text-[var(--ink-400)] opacity-[0.03]">
            <IconHexagon size={480} stroke={0.4} />
          </div>
          <div className="absolute bottom-[5%] -left-24 hidden md:block -rotate-[25deg] text-[var(--ink-400)] opacity-[0.03]">
            <IconTriangleSquareCircle size={440} stroke={0.4} />
          </div>
          <div className="absolute -top-16 -left-20 hidden xl:block rotate-[35deg] text-[var(--ink-400)] opacity-[0.025]">
            <IconCube size={400} stroke={0.4} />
          </div>
          <div className="absolute -bottom-20 right-[15%] hidden lg:block -rotate-[15deg] text-[var(--ink-400)] opacity-[0.025]">
            <IconLayersIntersect size={420} stroke={0.4} />
          </div>
        </div>

        {/* ── Centered Flexible Auth Card ── */}
        <div
          className={`relative z-10 my-auto w-full ${cardMaxWidth} overflow-hidden rounded-2xl border border-[var(--ink-200)] bg-white/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all sm:rounded-3xl`}
        >
          {/*
            ⚠ THE GRID IS `lg:` ONLY, AND THE ASIDE COMES SECOND IN THE DOM.
            Below the large breakpoint the two columns stack, and the order
            they stack in is the order they are written — form first, context
            after. A reader on a phone came here to register, not to read a
            roadmap before reaching the first field, and putting the rail
            above the form would push the whole point of the page below the
            fold on the narrowest screens.

            Padding moved off the outer card and onto each column so the
            aside's tint can reach the card's edges instead of floating in a
            white gutter.
          */}
          <div className={twoColumn ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]' : ''}>
            <div className="p-5 sm:p-7 lg:px-9 lg:py-7">
              {/* Header Area */}
              <div className="mb-5 text-left sm:mb-6">
                <h1 className="font-sans text-[24px] font-semibold tracking-tight text-[var(--text-primary)] sm:text-[28px]">
                  {title}
                </h1>

                {lede ? (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-secondary)] sm:text-[13px]">
                    {lede}
                  </p>
                ) : null}
              </div>

              {/* Form Content */}
              <div>{children}</div>

              {/* Footer slot (links, demo access, switches) */}
              {footer ? (
                <div className="mt-5 border-t border-[var(--ink-100)] pt-4 text-left">{footer}</div>
              ) : null}
            </div>

            {/*
              ⚠ NOT `aria-hidden`, THOUGH IT LOOKS LIKE DECORATION.
              The rail is tinted, secondary and visually quiet, which makes it
              tempting to hide from the accessibility tree — but the
              information in it exists NOWHERE ELSE on the page: how many
              steps remain, roughly how long, and that you may stop after any
              of them. Hiding it would mean a screen-reader user is the only
              reader who has to guess how long registration takes. Decoration
              is a thing that repeats; this does not.
            */}
            {aside ? (
              <aside
                aria-label="What happens after you create your workspace"
                className="border-t border-[var(--ink-200)]/70 bg-[var(--ink-50)]/50 p-5 sm:p-7 lg:border-t-0 lg:border-l lg:px-7 lg:py-7"
              >
                {aside}
              </aside>
            ) : null}
          </div>
        </div>
      </main>

      {/* ── Bottom Compliance & Trust Footer ── */}
      <footer className="shrink-0 relative z-10 w-full border-t border-[var(--ink-200)]/60 bg-white/60 px-6 py-2.5 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} aLcassa Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 font-medium">
            <Link
              href="/legal/terms"
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors hover:underline underline-offset-4"
            >
              Terms of Service
            </Link>
            <span className="text-[var(--ink-200)]">·</span>
            <Link
              href="/legal/privacy"
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors hover:underline underline-offset-4"
            >
              Privacy Notice
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
