import * as React from 'react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

/**
 * Google's mark, for the federated sign-in button.
 *
 * ⚠ THE FOUR HEXES ARE THE ONE LEGITIMATE EXCEPTION TO 03 §2. They are
 * Google's brand colours, fixed by their identity guidelines; tokenising them
 * would let a palette change silently alter somebody else's trademark.
 *
 * ⚠ `stroke` AND `color` ARE ACCEPTED AND DISCARDED, WHICH IS THE POINT. The
 * component is typed as a `TablerIcon` so it can sit in the same slots as
 * every other glyph in the product — but this is a four-path colour mark, not
 * a monochrome stroke icon, and honouring either prop would deface it. Naming
 * them here is what stops them reaching the `<svg>` through the spread, where
 * `stroke` in particular would paint an outline over all four paths.
 */
export const GoogleLogo: TablerIcon = ({
  size = 24,
  className,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured precisely so they do NOT reach the spread below; see the note above
  stroke,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- as above
  color,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);
