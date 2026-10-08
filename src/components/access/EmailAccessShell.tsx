import {
  IconArrowUpRight,
  IconFingerprint,
  IconKey,
  IconLinkOff,
  IconMail,
} from '@tabler/icons-react';
import { AuthShell } from './AuthShell';
import type { EmailPurpose } from '@/lib/auth/emailLink';

/** Email journeys share the console palette; decoration never represents account state. */
export function EmailAccessShell({
  purpose,
  unavailable = false,
  title,
  lede,
  children,
  footer,
}: {
  purpose: EmailPurpose;
  unavailable?: boolean;
  title: string;
  lede: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const Symbol = unavailable ? IconLinkOff : purpose === 'invite' ? IconMail : IconKey;
  return (
    <AuthShell
      cardMaxWidth="max-w-[540px]"
      artwork={<EmailArtwork purpose={purpose} />}
      footer={
        <div className="grid gap-4">
          {footer}
          <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
            Open the latest email. Keep its link private.
          </p>
        </div>
      }
    >
      <div className="mb-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <span className="text-xs font-medium tracking-[0.14em] text-[var(--text-tertiary)] uppercase">
            {purpose === 'invite' ? 'Workspace invitation' : 'Account recovery'}
          </span>
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
            aria-hidden="true"
          >
            <Symbol size={21} stroke={1.4} />
          </span>
        </div>
        <h1 className="text-2xl leading-[1.12] font-medium tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{lede}</p>
      </div>
      {children}
    </AuthShell>
  );
}

function EmailArtwork({ purpose }: { purpose: EmailPurpose }) {
  return (
    <div
      className="relative flex h-full min-h-[620px] flex-col justify-between overflow-hidden px-12 py-12 text-[var(--chrome-fg)] [background:var(--chrome-bg)] xl:px-20"
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--chrome-fg)_0.7px,transparent_0.9px)] [mask-image:linear-gradient(130deg,black,transparent_80%)] [background-size:20px_20px] opacity-[0.12]" />
      <IconFingerprint
        className="absolute -top-8 right-8 rotate-12 opacity-[0.06]"
        size={220}
        stroke={0.7}
      />
      <div className="relative flex items-center justify-between border-b border-white/10 pb-5 text-xs tracking-[0.14em] uppercase">
        <span>aLcassa / Account access</span>
        <IconArrowUpRight size={17} stroke={1.4} />
      </div>
      <div className="relative mx-auto my-12 flex size-[240px] items-center justify-center rounded-slab border border-white/10 bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_60px_rgba(0,0,0,0.18)] xl:size-[280px]">
        <div className="absolute inset-5 rounded-hero border border-white/[0.06]" />
        <IconMail
          size={126}
          stroke={0.75}
          className="-rotate-12 text-white/75 drop-shadow-[0_10px_12px_rgba(0,0,0,0.18)]"
        />
        <span className="absolute right-7 bottom-8 flex size-12 items-center justify-center rounded-2xl border border-white/15 text-white/70 [background:var(--chrome-bg)]">
          <IconKey size={22} stroke={1.2} />
        </span>
      </div>
      <div className="relative">
        <p className="mb-4 text-xs tracking-[0.14em] text-white/50 uppercase">
          {purpose === 'invite' ? 'A thoughtful beginning' : 'A simple return'}
        </p>
        <p className="text-section leading-[1.06] font-medium tracking-[-0.045em]">
          {purpose === 'invite' ? 'Your workspace starts here.' : 'A clear path back in.'}
        </p>
        <p className="mt-5 text-sm leading-6 text-white/60">
          {purpose === 'invite'
            ? 'Verify your invitation, choose a password and make yourself at home.'
            : 'Verify your email link, choose a new password and sign in again.'}
        </p>
      </div>
    </div>
  );
}
