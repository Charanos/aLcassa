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
      className="rounded-overlay p-5"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-raised)',
        boxShadow: 'var(--shadow-sm)',
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
        background: 'var(--surface-sunken)',
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

        {/* Security */}
        <CardBones>
          <Bar w={16} h={15} />
          <Bar w={68} h={12} r={4} />
          <div className="mt-5 grid gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Bar w="32px" h={32} r={999} />
                <div className="grid flex-1 gap-2">
                  <SkeletonText width={[44, 22, 34][i]} />
                  <SkeletonText width={[88, 76, 82][i]} />
                </div>
                <Bar w="82px" h={32} r={10} />
              </div>
            ))}
          </div>
        </CardBones>
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
