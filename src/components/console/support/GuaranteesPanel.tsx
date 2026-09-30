import {
  IconClock,
  IconLock,
  IconMail,
  IconShieldCheck,
  IconUserCheck,
  IconWriting,
} from '@tabler/icons-react';
import { IconTile } from '@/components/primitives/IconTile';
import { Panel } from '../Surface';

/**
 * What a support visit guarantees the customer, and where each is enforced.
 * Doc 24. Every line was checked against the code it names; the old page said
 * "read-only" and "no extension", and both were false.
 */
const GUARANTEES = [
  {
    icon: IconWriting,
    title: 'A reason, written for the customer',
    body: 'Required, 8 to 500 characters. It opens their activity log entry and the email they receive.',
    where: 'startSupportSession',
  },
  {
    icon: IconShieldCheck,
    title: 'Their rules, not a master key',
    body: 'Inside, the operator is role support under the workspace’s own row-level security. No credential secret, no extending the visit from inside, no acting as a member.',
    where: 'resolveSupportContext · 02_identity.sql',
  },
  {
    icon: IconClock,
    title: 'Thirty minutes, extended at most twice',
    body: 'Extending opens in the last five minutes and is written to their log. After ninety minutes, a new session with a new reason.',
    where: 'extendSupportSession',
  },
  {
    icon: IconMail,
    title: 'Told at once, and able to end it',
    body: 'Owners are emailed on entry. Owners and admins see who is inside and why, and can end the visit from their own workspace.',
    where: 'app.end_support_visit',
  },
  {
    icon: IconUserCheck,
    title: 'Every ending recorded, once',
    body: 'Left, ended by a colleague, ended by the customer, timed out, replaced, or closed by break glass — in both logs, with who.',
    where: 'closeSessions · app.close_lapsed_support_sessions',
  },
  {
    icon: IconLock,
    title: 'Break glass closes everything',
    body: 'Locking support access ends every open visit immediately and refuses new ones. Refused attempts are recorded.',
    where: 'setBreakGlass',
  },
];

export function GuaranteesPanel() {
  return (
    <Panel title="What the customer is guaranteed" variant="elevated">
      <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-2">
        {GUARANTEES.map((g) => (
          <li key={g.title} className="flex gap-3.5">
            <IconTile icon={g.icon} size="sm" />
            <div className="min-w-0">
              <p className="t-compact" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {g.title}
              </p>
              <p
                className="t-caption mt-1"
                style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
              >
                {g.body}
              </p>
              <p
                className="mt-1.5 font-mono text-2xs tracking-[0.04em]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {g.where}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
