import Link from 'next/link';
import { IconArrowRight, IconFingerprintScan, IconTerminal2 } from '@tabler/icons-react';
import { IconTile } from '@/components/primitives/IconTile';

/**
 * The two reviewer doors, under a labelled rule.
 *
 * ⚠ IT EXISTED TWICE, DIVERGENTLY, IN TWO SIGN-IN PAGES.
 *
 * `(access)/sign-in` and `(platform)/platform/sign-in` each carried their own
 * copy of this block — the rule, the caption, two tiles, two links, two arrows —
 * and the copies had drifted into two different designs of the same control:
 *
 *   the tenant door   `rounded-2xl`, a gradient tile, a diagonal tone wash,
 *                     `IconTerminal2` and `IconFingerprintScan`, hover lift
 *   the platform door `rounded-xl`, a flat `--danger-bg` square at `size-6`,
 *                     `IconShieldLock` and `IconBuildingSkyscraper`, no lift
 *
 * The first is the better design by a distance and the second is what a reviewer
 * actually saw first, because the platform sign-in is where a reviewer lands.
 * 18 §12: when two near-identical siblings differ, the difference is usually a
 * defect in one of them rather than a decision. One definition, the better
 * design, both doors.
 *
 * ⚠ THE GLYPHS ARE THE PAIR, AND THEY ARE A PAIR ON PURPOSE. A terminal prompt
 * for the console — the operator's tool, a place you type commands — and a
 * fingerprint scan for the workspace inbox, which is somebody's identity and
 * their messages. They say what is behind each door rather than decorating it,
 * and neither is a status, which is why they are `IconTile` and not `IconPill`.
 */
export function DemoDoors() {
  return (
    <div className="space-y-3 pt-1">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t" style={{ borderColor: 'var(--border-subtle)' }} />
        </div>
        <span
          className="relative px-3 font-mono text-[10px] tracking-wider uppercase"
          style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}
        >
          Reviewer &amp; Demo Mode
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Door
          href="/api/demo?role=platform"
          icon={IconTerminal2}
          tone="info"
          label="Admin Console"
        />
        <Door
          href="/api/demo?role=tenant"
          icon={IconFingerprintScan}
          tone="success"
          label="Workspace Inbox"
        />
      </div>
    </div>
  );
}

function Door({
  href,
  icon,
  tone,
  label,
}: {
  href: string;
  icon: typeof IconTerminal2;
  tone: 'info' | 'success';
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center justify-between rounded-2xl p-2.5 transition-all duration-200 hover:shadow-[var(--shadow-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] motion-reduce:transition-none"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-raised)',
        boxShadow: 'var(--neu-inset)',
      }}
    >
      <span className="flex items-center gap-3">
        {/* No `label` on the tile: the text beside it already names the door. */}
        <IconTile icon={icon} tone={tone} size="md" />
        <span className="text-[12.5px]" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {label}
        </span>
      </span>
      <IconArrowRight
        size={14}
        aria-hidden
        className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        style={{ color: 'var(--text-tertiary)' }}
      />
    </Link>
  );
}
