import Link from 'next/link';
import {
  IconArrowLeft,
  IconTriangleSquareCircle,
  IconLayersIntersect,
  IconFingerprint,
  IconRoute,
} from '@tabler/icons-react';
import { Wordmark } from '@/components/brand/Mark';
import { PlatformAside, TenantAside } from './AuthAside';
import { AuthIllustration } from './AuthIllustration';

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
  title?: string;
  lede?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  aside?: React.ReactNode;
  cardMaxWidth?: string;
}) {

  return (
    <div className="relative flex min-h-dvh lg:h-dvh w-full flex-col lg:flex-row overflow-hidden bg-white text-left selection:bg-[var(--blue-500)]/15">
      
      {/* ── LEFT PANE: Action Canvas ── */}
      <div 
        className={`relative z-20 flex w-full flex-col bg-white lg:h-full lg:overflow-hidden lg:border-r border-[var(--ink-200)]/60 lg:shadow-[20px_0_60px_-15px_rgba(0,0,0,0.05)] ${
          aside ? 'lg:w-[60%] xl:w-[58%]' : 'lg:w-[45%] xl:w-[40%]'
        }`}
      >
        
        {/* Header */}
        <header className="shrink-0 w-full px-6 sm:px-10 py-5 lg:py-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              aria-label="Back to aLcassa homepage"
              className="inline-flex items-center gap-2 rounded-lg transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
            >
              <Wordmark size={24} />
            </Link>
            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 text-[length:var(--text-sm)] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <IconArrowLeft
                size={13}
                className="transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Back to home</span>
            </Link>
          </div>
        </header>

        {/* Form Content */}
        {/*
         * ⚠ justify-center was removed. When a flex container uses justify-center
         * and its content overflows, the overflow escapes upward (clipping the top
         * of the content against the container boundary). Using a margin-auto inner
         * wrapper inside an overflow-y-auto scroll container anchors the content to
         * the top when it overflows, and centres it when it fits — without clipping.
         */}
        <main id="main" className="flex-1 flex flex-col px-6 sm:px-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className={`w-full mx-auto my-auto py-8 ${cardMaxWidth ?? 'max-w-[440px]'}`}>
            {(title || lede) && (
              <div className="mb-6 sm:mb-8 text-left">
                {title ? (
                  <h1 className="font-sans text-[26px] font-semibold tracking-tight text-[var(--text-primary)] sm:text-[30px]">
                    {title}
                  </h1>
                ) : null}
                {lede ? (
                  <p className={`leading-relaxed text-[var(--text-secondary)] ${
                    title ? 'mt-1.5 text-[length:var(--text-sm)] sm:text-[length:var(--text-base)]' : 'text-[length:var(--text-base)]'
                  }`}>
                    {lede}
                  </p>
                ) : null}
              </div>
            )}

            <div>{children}</div>

            {footer ? (
              <div className="mt-6 border-t border-[var(--ink-100)] pt-5 text-left">
                {footer}
              </div>
            ) : null}
          </div>
          
          {/* Mobile Aside fallback - rendered below the form on small screens if aside exists */}
          {aside ? (
             <div className="mt-10 lg:hidden border-t border-[var(--ink-200)]/70 pt-8">
               {aside}
             </div>
          ) : null}
        </main>


      </div>

      {/* ── RIGHT PANE: Context & Art Canvas (Hidden on mobile) ── */}
      <div className="relative hidden lg:flex flex-1 flex-col items-center justify-center bg-[#FAFAFA] overflow-hidden">
        
        {/* Immersive Background Art */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
          {/* Radial Orbs */}
          <div
            className="absolute -top-1/4 -right-1/4 size-[800px] rounded-full opacity-[0.25] blur-[140px]"
            style={{ background: 'radial-gradient(circle, var(--blue-400) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 left-0 size-[600px] rounded-full opacity-[0.15] blur-[120px]"
            style={{ background: 'radial-gradient(circle, var(--orange-400) 0%, transparent 70%)' }}
          />

          {/* Architectural Mesh */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="blueprint-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--ink-900)" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="curve-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--ink-900)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--ink-400)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
            <path d="M -200 200 C 200 400, 600 -100, 1200 300 S 1800 100, 2400 500" fill="none" stroke="url(#curve-grad)" strokeWidth="1.5" />
            <path d="M -200 400 C 300 600, 700 100, 1300 500 S 1900 300, 2500 700" fill="none" stroke="url(#curve-grad)" strokeWidth="1" strokeDasharray="4 4" />
          </svg>

          {/* Floating Geometric Marks */}
          {aside ? (
            /* Sign-up page (aside present) - structural geometry framing the journey card */
            <>
              <div className="absolute top-[2%] right-[4%] text-[var(--ink-600)] opacity-[0.06] rotate-[12deg]">
                <IconTriangleSquareCircle size={220} stroke={0.8} />
              </div>
              <div className="absolute bottom-[4%] left-[4%] text-[var(--ink-600)] opacity-[0.06] -rotate-[15deg]">
                <IconLayersIntersect size={280} stroke={0.7} />
              </div>
            </>
          ) : (
            /* Sign-in page (no aside) - architectural/network blend */
            <>
              <div className="absolute top-[10%] right-[12%] text-[var(--blue-500)] opacity-[0.05] rotate-[30deg]">
                <IconFingerprint size={280} stroke={0.8} />
              </div>
              <div className="absolute bottom-[10%] left-[10%] text-[var(--orange-500)] opacity-[0.05] -rotate-[15deg]">
                <IconRoute size={320} stroke={0.7} />
              </div>
            </>
          )}
        </div>

        {/* Context Aside or Illustration */}
        {aside ? (
          <aside className="relative z-10 w-full max-w-[460px] p-8 xl:p-12">
            <div className="rounded-2xl border border-[var(--ink-200)]/60 bg-white/70 backdrop-blur-xl p-8 shadow-sm">
              {aside}
            </div>
          </aside>
        ) : (
          <div className="relative z-10 flex w-full h-full items-center justify-center">
            <AuthIllustration />
          </div>
        )}

      </div>
    </div>
  );
}
