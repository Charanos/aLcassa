import { SkeletonText } from '@/components/primitives/Skeleton';

/**
 * The profile's loading shape.
 *
 * ⚠ IT MIRRORS THIS SURFACE, NOT "A PAGE". The route's `loading.tsx` used to
 * render a generic header plus two `SkeletonPanel`s — a four-line box and a
 * three-line box — against a screen that is a two-column grid of four cards,
 * one of which opens with a 60px avatar and a pair of 40px fields. So the
 * skeleton and the page it stood in for had different column counts and
 * different heights, and the hand-off was a visible jump: 03 §15 asks for
 * identical dimensions precisely because the skeleton's job is to hold the
 * layout still while the data arrives.
 *
 * ⚠ ONE SCREENFUL, NOT THE WHOLE PAGE. Also 03 §15. The device list is below
 * the fold on every viewport this console targets, and drawing bones for rows
 * nobody can see is motion in the corner of the eye for no information.
 *
 * ⚠ NO SHIMMER SWEEP — the bones come from `Skeleton.tsx`, which pulses
 * opacity and goes static under `prefers-reduced-motion`. A travelling gradient
 * reads as a progress bar, which implies a known duration this page cannot
 * promise.
 */

/** The card shell, matching `SettingsSection`'s radius, border and padding. */
function CardBones({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[16px] px-5 py-4"
      style={{
        background: 'var(--surface-sunken)',
        boxShadow: 'var(--shadow-sm), var(--glass-highlight), 0 0 0 1px var(--border-subtle)',
      }}
    >
      {children}
    </div>
  );
}

/** A bone with no text semantics, sized by the caller. */
function Bar({ w, h = 14, r = 6 }: { w: number | string; h?: number; r?: number }) {
  return (
    <span
      aria-hidden
      className="block animate-[skeleton-pulse_1400ms_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-70"
      style={{
        width: typeof w === 'number' ? `${w}%` : w,
        height: h,
        borderRadius: r,
        background: 'var(--surface-inset)',
      }}
    />
  );
}

export function ProfileSkeleton() {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-5">
        {/* Identity */}
        <CardBones>
          <Bar w={22} h={15} />
          <Bar w={46} h={12} r={4} />

          {/* The avatar row: a 72px circle, two lines of prose, two controls.
              Identical dimensions to `AvatarField`, so the hand-off does not
              move the fields underneath it. */}
          <div
            className="mt-5 flex items-center gap-5 pb-5"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <Bar w="72px" h={72} r={999} />
            <div className="grid flex-1 gap-2">
              <SkeletonText width={92} />
              <SkeletonText width={76} />
              <div className="mt-1 flex gap-2">
                <Bar w="116px" h={32} r={10} />
                <Bar w="88px" h={32} r={10} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="grid gap-2">
                <Bar w={26} h={12} r={4} />
                {/* 40px: the real field's height, so nothing shifts on arrival. */}
                <Bar w="100%" h={40} r={10} />
                <Bar w={72} h={11} r={4} />
              </div>
            ))}
          </div>
        </CardBones>

        {/*
          Security.

          ⚠ THREE THINGS HAD DRIFTED FROM THE REAL LIST, all in the same
          direction — the skeleton was drawn against an older `SecurityList`
          and stayed still while that component changed underneath it.

          The rows are BORDERED CARDS in a `gap-4` column, not flat rows in one
          card; the glyph is 40px, not 32; and the middle control is now
          "Change password", which is a real button with an icon at roughly
          twice the width of the two inert ones beside it. Drawing all three at
          82px put the wrong one in the reader's eye for the whole load.

          The heading is `SectionHeading align="right"`, which is a rule with a
          right-aligned title over it rather than a card header — the last
          difference, and the one that was moving the rows down by ~20px.
        */}
        <div className="grid gap-4">
          <div>
            <div
              aria-hidden
              className="mb-6 h-px w-full bg-gradient-to-l from-[var(--border-strong)]/40 to-transparent"
            />
            <div className="flex flex-col items-end">
              <Bar w="132px" h={26} r={8} />
              <div className="mt-2.5 flex justify-end">
                <Bar w="300px" h={13} r={4} />
              </div>
            </div>
          </div>

          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl px-6 py-4"
              style={{
                background: 'var(--surface-sunken)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-start gap-4">
                <Bar w="40px" h={40} r={999} />
                <div className="grid flex-1 gap-2">
                  <SkeletonText width={[44, 22, 34][i]} />
                  <SkeletonText width={[88, 76, 82][i]} />
                  {/* Only the two inert rows carry a reason paragraph; the
                      password row's control replaced its own. */}
                  {i !== 1 ? <SkeletonText width={[70, 0, 64][i]} /> : null}
                </div>
                {/* 152px for the live "Change password" button, 82 for the
                    two disabled ones. */}
                <Bar w={i === 1 ? '152px' : '82px'} h={34} r={10} />
              </div>
            </div>
          ))}

          <div className="px-1">
            <SkeletonText width={94} />
            <div className="mt-1.5">
              <SkeletonText width={62} />
            </div>
          </div>
        </div>
      </div>

      {/* Rail */}
      <div className="grid gap-5">
        <CardBones>
          <Bar w={34} h={15} />
          <Bar w={70} h={12} r={4} />
          <div className="mt-5">
            <Bar w="96px" h={28} r={999} />
          </div>
          <div className="mt-5 grid gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Bar w="16px" h={16} r={999} />
                <div className="grid flex-1 gap-1.5">
                  <SkeletonText width={[58, 66, 52][i]} />
                  <SkeletonText width={[88, 80, 92][i]} />
                </div>
              </div>
            ))}
          </div>
        </CardBones>
      </div>
    </div>
  );
}
