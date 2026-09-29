'use client';

import { useId } from 'react';
import { IconAlertTriangle, IconCheck, IconHelpCircle } from '@tabler/icons-react';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { SettingsSection } from '@/components/console/Surface';
import { AvatarField } from '@/components/console/profile/AvatarField';
import { AuditLine, AuditNote, FieldLabel, Hint } from '@/components/console/profile/shared';
import { NAME_MAX, initialsFrom } from '@/lib/console/profileName';

/**
 * Who you are: your photograph, your name, your address.
 *
 * ⚠ IT HOLDS NO STATE. Every value and every handler comes from `ProfileForm`,
 * because the control that commits this form is the floating bar at the bottom
 * of the page and a bar cannot be sticky inside a card it has scrolled past.
 * Lifting the draft is what lets the bar exist; this card is the view of it.
 *
 * ⚠ THE AVATAR IS THE ONE THING HERE THAT IS NOT PART OF THE DRAFT. Picking an
 * image commits it immediately — see `AvatarField` for why holding a chosen
 * file behind a Save button is the wrong contract for a binary.
 */
export function IdentityCard({
  draft,
  onDraft,
  serverName,
  email,
  emailVerified,
  initials,
  avatarUrl,
  live,
  inputRef,
  dirty,
  invalid,
  error,
  outcome,
  pending,
  onSave,
  onDiscard,
}: {
  draft: string;
  onDraft: (next: string) => void;
  /** The saved value, for the avatar's dialog copy and the revert target. */
  serverName: string;
  email: string;
  /** `null` means not readable from the console. See `ProfileModel`. */
  emailVerified: boolean | null;
  initials: string;
  avatarUrl: string | null;
  /** False on the preview path: every write is refused. */
  live: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  dirty: boolean;
  invalid: boolean;
  error: string | null;
  outcome: { tone: 'saved' | 'error'; message: string } | null;
  pending: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const fieldId = useId();
  const hintId = useId();
  const statusId = useId();

  /* One string, so the live region announces one sentence rather than a
     fragment per state. */
  const status = pending
    ? 'Saving…'
    : error
      ? error
      : outcome
        ? outcome.message
        : dirty
          ? 'Unsaved — use the bar at the foot of the page, or press ⌘↵'
          : 'No changes';

  const statusInk =
    error || outcome?.tone === 'error'
      ? 'var(--danger-fg)'
      : outcome?.tone === 'saved'
        ? 'var(--success-fg)'
        : dirty
          ? 'var(--warning-fg)'
          : 'var(--text-tertiary)';

  return (
    /* No title: the page heading above names this card. See SettingsSection. */
    <SettingsSection>
      <AvatarField initials={initials} src={avatarUrl} name={serverName} live={live} />

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={fieldId}>Full name</FieldLabel>
          <input
            id={fieldId}
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={NAME_MAX}
            autoComplete="name"
            spellCheck={false}
            aria-describedby={`${hintId} ${statusId}`}
            aria-invalid={invalid || undefined}
            disabled={!live}
            /* ⚠ THE REASON, NOT JUST THE DISABLING. 17 §6.4 applies to a control
               that is temporarily dead as much as to a permanently dead one.
               `PreviewNotice` above carries the full explanation and the way
               out; this is the pointer-level restatement for somebody who went
               straight for the field. */
            title={live ? undefined : 'Sign in again to change your name.'}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              /* ⌘↵ saves, Esc discards. The two shortcuts anybody tries in a
                 single-field form, and neither existed. */
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSave();
              }
              if (e.key === 'Escape' && dirty) {
                e.preventDefault();
                onDiscard();
              }
            }}
            className="t-body h-10 w-full rounded-overlay px-3 transition-colors outline-none focus-visible:border-[var(--blue-500)] focus-visible:ring-1 focus-visible:ring-[var(--blue-500)]"
            style={{
              border: `1px solid ${invalid ? 'var(--danger-fg)' : 'var(--border-strong)'}`,
              background: 'var(--surface-raised)',
              boxShadow: 'var(--neu-inset)',
              color: 'var(--text-primary)',
            }}
          />
          <Hint id={hintId}>
            Appears beside every action you take, in customer audit logs.
            {/* ⚠ THE INITIALS FOLLOW THE FIELD, and this sentence is why that
                matters: it claims initials are generated from the name, and the
                avatar above demonstrates it live as the reader types. */}
            {draft.trim() && !avatarUrl ? ` Your initials would be ${initialsFrom(draft)}.` : ''}
          </Hint>
        </div>

        <div>
          <FieldLabel>Email</FieldLabel>
          <div
            className="flex h-10 items-center gap-2.5 rounded-overlay px-3"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-sunken)',
              boxShadow: 'var(--neu-inset)',
            }}
          >
            <span
              className="min-w-0 flex-1 truncate"
              style={{
                font: '400 var(--type-compact)/1 var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
              title={email}
            >
              {email}
            </span>
            <EmailState verified={emailVerified} />
          </div>
          <Hint>Changing this requires another platform admin to approve the change.</Hint>
        </div>
      </div>

      <AuditNote className="mt-5">
        <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
          Changing your name or your photo records, in the same transaction as the change:
        </p>
        <ul className="mt-1.5 grid gap-1">
          <AuditLine>
            this platform&rsquo;s audit log, naming you, your address and what changed
          </AuditLine>
          <AuditLine>
            it does <em>not</em> rewrite the admin roster&rsquo;s entry for you &mdash; that label
            belongs to whoever granted your access
          </AuditLine>
        </ul>
      </AuditNote>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className="t-caption mt-4 flex items-start gap-1.5"
        style={{ color: statusInk, textWrap: 'pretty' }}
      >
        {error || outcome?.tone === 'error' ? (
          <IconAlertTriangle size={12} stroke={2} aria-hidden className="mt-0.5 shrink-0" />
        ) : outcome?.tone === 'saved' ? (
          <IconCheck size={12} stroke={2} aria-hidden className="mt-0.5 shrink-0" />
        ) : null}
        <span className="min-w-0">{status}</span>
      </p>
    </SettingsSection>
  );
}

/**
 * Verified, not verified, or not knowable from here — three states, three
 * different things to say.
 *
 * ⚠ THE THIRD STATE IS THE POINT. The live reader cannot see verification: it
 * lives in `auth.users`, behind the admin client that is lint-guarded to
 * `modules/platform` for bypassing RLS. It used to report a flat `false`, and
 * `false` rendered as no badge at all — indistinguishable from an address that
 * had genuinely never been confirmed.
 *
 * Those are opposite claims about somebody's account. The same reasoning, and
 * the same resolution, as `Admin.mfa` reporting "MFA unknown" rather than
 * "MFA off".
 */
function EmailState({ verified }: { verified: boolean | null }) {
  /*
   * ⚠ THE SQUARER CHIP IS KEPT; THE RAW PALETTE IS NOT.
   *
   * The front-end pass replaced these three badges with hand-rolled spans to
   * get a softer, squarer shape than the default pill — a good call, and the
   * reason `StatusBadge` has a `squircle` variant. What came with it was five
   * raw values: `bg-green-50/50`, `#bbf7d0`, `bg-amber-50/50`, `#fde68a`,
   * `bg-slate-50`.
   *
   * That is the exact regression `StatusBadge` was rewritten to end. It used to
   * carry 36 Tailwind palette classes and 16 `rgba()` literals; the `--badge-*`
   * tokens replaced them so a tone's tint, edge and ink are one decision made
   * once, and so a chip on a cream ground and a chip on the chrome slab cannot
   * drift apart. Re-deriving a green chip by hand in one component puts the
   * drift back, in the one place nobody will look for it.
   *
   * `variant="squircle"` is the shape they wanted, at 7px. Same look, no hex.
   */
  if (verified === true) {
    return (
      <StatusBadge tone="success" variant="squircle" size="sm" icon={IconCheck}>
        verified
      </StatusBadge>
    );
  }
  if (verified === false) {
    return (
      <StatusBadge tone="warning" variant="squircle" size="sm" icon={IconAlertTriangle}>
        unverified
      </StatusBadge>
    );
  }
  return (
    <StatusBadge
      tone="neutral"
      variant="squircle"
      size="sm"
      icon={IconHelpCircle}
      title="Verification is held by the identity provider, which this console does not read."
    >
      not checked here
    </StatusBadge>
  );
}
