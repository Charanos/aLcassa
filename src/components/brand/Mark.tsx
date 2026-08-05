/**
 * 03 §22. THE MARK.
 *
 * There is no brand. Ask at design lock whether one exists (01 §9 question 2);
 * if not, this placeholder ships and looks deliberate rather than unfinished.
 *
 * A 1:1 square outline at 1.5px containing two horizontal rules offset from
 * centre, suggesting a conduit passing through a boundary. Which is what the
 * product is: the layer that carries messages between systems without being
 * the message.
 *
 * The wordmark is ABSENT until a name exists, and the mark stands alone. A
 * placeholder wordmark reading "Conduit" would be worse, because Conduit is the
 * codename for the design system and this document set, not a proposed product
 * name.
 *
 * The mark never sits on an image, never gets a container, never animates.
 * Favicon, app icon and OG image are generated from this one file, so when a
 * real identity arrives this changes and nothing else does.
 */

export type MarkProps = {
  size?: number;
  tone?: 'copper' | 'inverse' | 'ink';
  title?: string;
};

const TONES = {
  copper: 'var(--copper-solid)',
  inverse: 'var(--ink-inverse)',
  ink: 'var(--ink-primary)',
} as const;

export function Mark({ size = 24, tone = 'copper', title }: MarkProps) {
  const colour = TONES[tone];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-slot="mark"
    >
      {/* the boundary */}
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="2"
        stroke={colour}
        strokeWidth="1.5"
      />
      {/* two conduits passing through it, offset from centre */}
      <path d="M1.5 9.5H22.5" stroke={colour} strokeWidth="1.5" />
      <path d="M1.5 15.5H22.5" stroke={colour} strokeWidth="1.5" />
    </svg>
  );
}
