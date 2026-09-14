import * as React from 'react';

/**
 * THE CHROME BADGE.
 *
 * ⚠ THIS IS NOT THE ONLY BADGE IN THE SYSTEM, and the difference is the tier
 * rather than the taste.
 *
 * `@/components/feedback/Badge` carries the closed `tone` set from 03 §14 —
 * active, past due, support, and the rest — and renders on the cream page with
 * the muted ink-on-light status scale. This one renders on the CHROME TIER:
 * the near-black slab the console header, rail and hero stand on, where
 * `--green-500` reads as mud. It takes an open `intent` and draws from the
 * lightened chrome status steps for exactly the reason `--chrome-action` is a
 * lightened step rather than `--blue-500`.
 *
 * Two components, two grounds, one meaning per name. If a badge ever needs to
 * cross grounds, that is a third component and a conversation, not a prop.
 *
 * ⚠ NO RAW COLOUR IN HERE. The identity law is that a hex in a component file
 * is a defect; the surface, rim, glow and every intent ink are Tier 4 chrome
 * tokens. The alphas are tokens too, so a rim that is too hot is one edit in
 * `tokens.css` rather than six in this file.
 */

/** Valid colour intents for a badge, each mapping to one chrome status ink. */
export type BadgeIntent = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  intent?: BadgeIntent;
  /** Whether to show a glowing dot indicator before the text. */
  indicator?: boolean;
  /** The text or elements to display inside the badge. */
  children: React.ReactNode;
  /**
   * If true, uses the ultra-crisp `.t-badge` typography.
   * If false, uses slightly larger `.t-caption`. Defaults to true.
   */
  crisp?: boolean;
}

/**
 * The ink each intent speaks in. `neutral` is the absence of an intent rather
 * than a sixth colour, so it takes the chrome's own muted foreground and skips
 * the tint entirely.
 */
const INTENT_INK: Record<BadgeIntent, string | null> = {
  success: 'var(--chrome-success)',
  warning: 'var(--chrome-warning)',
  danger: 'var(--chrome-danger)',
  info: 'var(--chrome-info)',
  brand: 'var(--chrome-brand)',
  neutral: null,
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { intent = 'neutral', indicator = false, crisp = true, children, className, style, ...props },
    ref
  ) => {
    const ink = INTENT_INK[intent];
    const fg = ink ?? 'var(--chrome-fg-muted)';

    /*
      The rim and the glow are the intent ink held back to a tint. `color-mix`
      does that against a token rather than against a hardcoded rgba, which is
      the whole reason the ink can stay a variable this far down.
    */
    const border = ink
      ? `color-mix(in srgb, ${ink} calc(var(--chrome-badge-border-alpha) * 100%), transparent)`
      : 'var(--chrome-badge-border)';

    const shadow = ink
      ? `var(--chrome-badge-shadow), inset 0 0 12px color-mix(in srgb, ${ink} calc(var(--chrome-badge-glow-alpha) * 100%), transparent)`
      : 'var(--chrome-badge-shadow)';

    const typographyClass = crisp ? 't-badge' : 't-caption';
    const paddingClass = crisp ? 'px-[8px] py-[3px]' : 'px-[10px] py-[3px]';

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1.5 rounded-full font-mono whitespace-nowrap ${typographyClass} ${paddingClass} ${className || ''}`}
        style={{
          background: 'var(--chrome-badge-bg)',
          border: `1px solid ${border}`,
          color: fg,
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          boxShadow: shadow,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          ...style,
        }}
        {...props}
      >
        {indicator && (
          <span
            className="shrink-0 rounded-full"
            style={{
              width: 5,
              height: 5,
              background: fg,
              boxShadow: `0 0 6px ${fg}`,
            }}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
