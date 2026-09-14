import { IconKey, IconLifebuoy, IconLock } from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';
import type { SecurityItem, SecurityKey } from '@/lib/console/data';
import { InertControl, SectionHeading, BandLink } from '@/components/console/Surface';
import { RecordRow, RowGlyph } from '@/components/console/profile/shared';
import { ChangePassword } from '@/components/console/profile/ChangePassword';

/**
 * The three security controls: one that acts, two that genuinely cannot.
 *
 * ⚠ ALL THREE USED TO BE DISABLED, AND THE ARGUMENT FOR THAT WAS ONE ARGUMENT
 *   COVERING THREE DIFFERENT SITUATIONS. It read: "Two-factor enrolment, the
 *   password and the recovery codes all live in Supabase's `auth.users`,
 *   reachable only through the admin client — which is lint-guarded because it
 *   bypasses Row Level Security."
 *
 * That is true of MFA enrolment STATUS, which is why the checklist still
 * refuses to claim anything about what you have enrolled. It is true of
 * recovery codes for a better reason: they are shown once and stored nowhere,
 * so there is nothing here to show.
 *
 * It was never true of the password. `supabase.auth.updateUser` changes the
 * CALLER'S OWN credential through the publishable key, bound by the same RLS as
 * every other read on this screen, and `api/v1/auth/password/reset` had been
 * doing exactly that for months. The control is live now — see
 * `ChangePassword` and the correction in `profile-actions.ts`.
 *
 * The failure worth remembering is not the missing feature. It is that three
 * controls were grouped by where their data happened to live, given one
 * confident paragraph, and then stopped being looked at — which is how a wrong
 * reason outlives no reason at all.
 *
 * ⚠ AND WHY THE REASONS MOVED OUT OF `title=`.
 *
 * `InertControl` carries the reason in a tooltip and its own documentation says
 * that is not sufficient: "the reason is also rendered as text beside or
 * beneath the control by the caller. This component refuses to be the only
 * carrier." This caller did not render it. Three greyed-out buttons shipped
 * with their explanation reachable only by hovering a pointer over them — so a
 * keyboard reader, a touch reader and a screen-reader user each got a dead
 * control and no account of why, which is the requirement failed in the one
 * place on the console where it matters most.
 *
 * 18 §6 recorded the same lesson from the queue's disabled action, where the
 * reason was inline and TRUNCATED. Both fixes are the same fix: the reason gets
 * the row's full width, on its own line, as text.
 */

const GLYPH: Record<SecurityKey, TablerIcon> = {
  mfa: IconLock,
  password: IconKey,
  recovery: IconLifebuoy,
};

/**
 * ⚠ KEYED BY `key`, NOT BY LABEL. 18 §9: maps keyed by a display string break
 * silently the first time somebody improves the wording above them.
 */
const REASON: Record<SecurityKey, string> = {
  mfa: 'Enrolment and code regeneration are held by the identity provider. This console never sees a factor, which is also why it cannot show you whether one is enrolled.',
  password: '',
  recovery:
    'Recovery codes are issued once, at enrolment, and shown only that one time. Nothing stores them afterwards — not the identity provider, and not this screen.',
};

export function SecurityList({ items }: { items: readonly SecurityItem[] }) {
  return (
    <section className="flex flex-col">
      <SectionHeading
        title="Security"
        note="You can see every workspace on the platform. These controls are the reason that is safe."
        align="right"
        action={<BandLink href="/platform/settings">Go to settings</BandLink>}
      />

      <div className="flex flex-col gap-4">
        {items.map((item) => {
          const Glyph = GLYPH[item.key];
          return (
            <div
              key={item.key}
              className="overflow-hidden rounded-xl border transition-shadow duration-300 hover:shadow-[var(--shadow-md)]"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <RecordRow
                glyph={
                  <RowGlyph tone={item.state === 'good' ? 'success' : 'neutral'}>
                    <Glyph size={20} stroke={1.5} />
                  </RowGlyph>
                }
                label={
                  <span
                    className="text-[14px]"
                    style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                  >
                    {item.label}
                  </span>
                }
                detail={item.detail}
                note={
                  REASON[item.key] ? (
                    <p
                      className="mt-1 text-[13px]"
                      style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
                    >
                      {REASON[item.key]}
                    </p>
                  ) : null
                }
                control={
                  /*
                    ⚠ ONE OF THESE THREE IS NOW A REAL CONTROL.

                    All three shipped disabled behind one paragraph, and the
                    paragraph was wrong about the middle one — see
                    `ChangePassword` and `profile-actions.ts`. Grouping controls
                    by where their data happens to live, then writing a single
                    security rationale for the group, is what let a buildable
                    action sit dead for a whole phase.

                    The other two are genuinely blocked and their reasons are
                    unchanged: enrolment STATUS needs the RLS-bypassing client,
                    and recovery codes are deliberately stored nowhere.
                  */
                  item.key === 'password' ? (
                    <ChangePassword />
                  ) : (
                    <InertControl
                      reason={REASON[item.key] ?? item.action}
                      className="inline-flex h-[34px] shrink-0 items-center justify-center rounded-lg px-4 text-[13px] font-medium transition-colors"
                    >
                      <span style={{ color: 'var(--text-tertiary)' }}>{item.action}</span>
                    </InertControl>
                  )
                }
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5 px-1">
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
        >
          Your password is changed here, and takes effect immediately. The other two state the
          platform&rsquo;s policy rather than the state of your account &mdash; neither is read
          from this screen, so neither is a claim about what you personally have enrolled.
        </p>
      </div>
    </section>
  );
}
