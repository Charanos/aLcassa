import { forwardRef } from 'react';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClockHour3,
  IconMinus,
  IconPointer,
  IconTerminal2,
} from '@tabler/icons-react';

/**
 * Design sheet 03 · status chips, and 03 §14 · the badge taxonomy.
 *
 * CHIPS ARE A CLOSED SET. These six are the whole vocabulary for state in this
 * product. A state that is not on this table does not get a badge, and a
 * seventh requires one to be retired.
 *
 * HUE IS NEVER ALONE. Every chip carries a glyph AND a word as well as a tint,
 * so meaning survives colour blindness and survives a printed audit export,
 * which is the format an auditor actually reads.
 *
 * The one distinction worth internalising:
 *
 *   OCHRE RESOLVES. A refusal the reader can act on: a limit, a rate, a pending
 *   state. A tenant at 15 of 15 seats has not failed; it has arrived at the
 *   limit its plan describes, and the console's job there is to offer the tier
 *   above it.
 *
 *   OXIDE REFUSES. A refusal the reader cannot act on, and every destructive
 *   action.
 *
 * The hue tells them whether to try something or to ask someone.
 */

export type BadgeTone =
  /** Provisioned, within every limit. Never used for a call to action. */
  | 'active'
  /** No subscription record yet. Also: system and machine facts. */
  | 'trialing'
  /** Within ten percent of a ceiling. */
  | 'nearLimit'
  /** Payment overdue, access unchanged. */
  | 'pastDue'
  /** Soft deleted, recoverable. Inert. */
  | 'archived'
  /** Owner switched in, scoped session. THE ONLY STATE RENDERED IN COPPER,
   *  and the only chip that also appears outside a table. */
  | 'support';

type ToneSpec = {
  icon: typeof IconCircleCheck;
  ink: string;
  tint: string;
  rule: string;
  defaultLabel: string;
};

const TONES: Record<BadgeTone, ToneSpec> = {
  active: {
    icon: IconCircleCheck,
    ink: 'var(--green-500)',
    tint: 'var(--green-100)',
    rule: 'color-mix(in oklab, var(--green-500) 38%, var(--surface-base))',
    defaultLabel: 'Active',
  },
  trialing: {
    icon: IconTerminal2,
    ink: 'var(--ink-600)',
    tint: 'var(--ink-50)',
    rule: 'var(--ink-300)',
    defaultLabel: 'Trialing',
  },
  nearLimit: {
    icon: IconClockHour3,
    ink: 'var(--amber-500)',
    tint: 'var(--amber-100)',
    rule: 'color-mix(in oklab, var(--amber-500) 38%, var(--surface-base))',
    defaultLabel: 'Near limit',
  },
  pastDue: {
    icon: IconAlertTriangle,
    ink: 'var(--red-500)',
    tint: 'var(--red-100)',
    rule: 'color-mix(in oklab, var(--red-500) 38%, var(--surface-base))',
    defaultLabel: 'Past due',
  },
  archived: {
    icon: IconMinus,
    ink: 'var(--ink-500)',
    tint: 'var(--ink-100)',
    rule: 'var(--ink-300)',
    defaultLabel: 'Archived',
  },
  support: {
    icon: IconPointer,
    ink: 'var(--blue-500)',
    tint: 'var(--blue-50)',
    rule: 'var(--blue-200)',
    defaultLabel: 'Support mode',
  },
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone: BadgeTone;
  /** Omit to use the tone's own word. Never omit the word itself. */
  children?: React.ReactNode;
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone, children, className, ...props },
  ref,
) {
  const spec = TONES[tone];
  const Icon = spec.icon;

  return (
    <span
      ref={ref}
      data-slot="badge"
      data-tone={tone}
      className={['t-chip inline-flex h-5 items-center gap-1 rounded-chip border px-2', className]
        .filter(Boolean)
        .join(' ')}
      style={{ color: spec.ink, background: spec.tint, borderColor: spec.rule }}
      {...props}
    >
      <Icon size={12} stroke={1.5} aria-hidden />
      {children ?? spec.defaultLabel}
    </span>
  );
});

/**
 * 03 §14 maps domain states onto the closed set. Keeping the mapping here
 * rather than at each call site is what stops a "provisioning" badge appearing
 * in slate on one screen and graphite on another.
 */
export const TENANT_STATUS_TONE: Record<string, BadgeTone> = {
  provisioning: 'trialing',
  trial: 'trialing',
  active: 'active',
  past_due: 'pastDue',
  suspended: 'pastDue',
  closed: 'archived',
};

export const SUBSCRIPTION_STATUS_TONE: Record<string, BadgeTone> = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'pastDue',
  paused: 'nearLimit',
  cancelled: 'archived',
  expired: 'archived',
};

export const CREDENTIAL_STATUS_TONE: Record<string, BadgeTone> = {
  active: 'active',
  rotating: 'nearLimit',
  revoked: 'pastDue',
};

/** 03 §14. Member "Active" carries NO badge — absence is the signal, so
 *  `'active'` is deliberately absent from this map. Call sites render a badge
 *  only when a status has an entry here. */
export const MEMBER_STATUS_TONE: Record<string, BadgeTone> = {
  invited: 'trialing',
  invitation_expired: 'nearLimit',
  suspended: 'pastDue',
};
