import {
  SkeletonGroup,
  SkeletonHeader,
  SkeletonPanel,
  SkeletonRow,
} from '@/components/primitives/Skeleton';

/**
 * The three shapes every tenant settings screen actually is.
 *
 * ⚠ FOURTEEN OF THE TENANT APP'S FIFTEEN ROUTES HAD NO `loading.tsx` AT ALL.
 * The console has one per screen; this side had exactly one, for the
 * overview. Without it Next.js has no boundary to show, so navigating between
 * settings screens did nothing visible until the server answered — on a slow
 * connection the reader taps "Team", watches the current page sit there, and
 * taps again.
 *
 * ⚠ THEY ARE SHARED RATHER THAN FOURTEEN BESPOKE FILES BECAUSE THE SCREENS
 * GENUINELY ARE THE SAME THREE SHAPES. A settings form is a heading and a
 * panel of fields; a register is a heading and rows; a summary is a heading
 * and a couple of panels. Writing each one out separately would not make any
 * of them more accurate — it would just create fourteen places to forget when
 * `Panel`'s padding changes. Where a screen is genuinely its own shape, as
 * the overview is, it keeps its own file.
 *
 * 03 §15 still governs the pieces: mirror the real structure, no shimmer
 * sweep, `aria-busy` once on the container, never more than one screenful.
 */

/** A settings screen that is one form: company, appearance, profile, invite. */
export function FormPageSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} className="grid gap-5">
      <SkeletonHeader />
      <SkeletonPanel lines={5} />
    </SkeletonGroup>
  );
}

/**
 * A register: team, credentials, sessions, activity. Four rows, because that
 * is roughly what fits above the fold and the rule is one screenful — a
 * skeleton listing twenty rows promises a page length nobody has measured.
 */
export function ListPageSkeleton({
  label,
  withAction = true,
}: {
  label: string;
  withAction?: boolean;
}) {
  return (
    <SkeletonGroup label={label} className="grid gap-5">
      <SkeletonHeader withAction={withAction} />
      <div className="grid gap-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </SkeletonGroup>
  );
}

/** A summary of a few panels: billing, plan and usage, the settings index. */
export function PanelsPageSkeleton({
  label,
  panels = 2,
}: {
  label: string;
  panels?: number;
}) {
  return (
    <SkeletonGroup label={label} className="grid gap-5">
      <SkeletonHeader />
      {Array.from({ length: panels }, (_, i) => (
        <SkeletonPanel key={i} lines={i === 0 ? 4 : 3} />
      ))}
    </SkeletonGroup>
  );
}
