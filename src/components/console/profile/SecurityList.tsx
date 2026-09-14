import { IconKey, IconLifebuoy, IconLock } from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';
import type { SecurityItem, SecurityKey } from '@/lib/console/data';
import { InertControl, SectionHeading, BandLink } from '@/components/console/Surface';
import { RecordRow, RowGlyph } from '@/components/console/profile/shared';

/**
 * The three security controls, and why none of them can act from here.
 *
 * ⚠ WHY THREE DISABLED CONTROLS ARE THE RIGHT ANSWER AND NOT A GAP. 17 §6.4.
 *
 * Two-factor enrolment, the password and the recovery codes all live in
 * Supabase's `auth.users`, reachable only through the admin client — which is
 * lint-guarded to `modules/platform` because it bypasses Row Level Security.
 * Widening that guard so a console screen can redraw a checklist is a poor
 * trade, and these three are the SECURITY items on a security panel: a control
 * that silently did nothing here is worse than one that says what it needs.
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
  password:
    'Password changes go through the recovery flow, which proves control of the address first. A console that could set a password for a signed-in session would be a way around that proof.',
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
                  <p
                    className="mt-1 text-[13px]"
                    style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
                  >
                    {REASON[item.key]}
                  </p>
                }
                control={
                  <InertControl
                    reason={REASON[item.key]}
                    className="inline-flex h-[34px] shrink-0 items-center justify-center rounded-lg px-4 text-[13px] font-medium transition-colors"
                  >
                    <span style={{ color: 'var(--text-tertiary)' }}>{item.action}</span>
                  </InertControl>
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
          This panel states the platform&rsquo;s policy, not the state of your account. None of the
          three is read from here, so nothing above is a claim about what you personally have
          enrolled.
        </p>
      </div>
    </section>
  );
}
