import React from 'react';
import {
  IconArrowUpRight,
  IconBrandWhatsappFilled,
  IconBrandInstagram,
  IconBrandMessengerFilled,
  IconMessageCircle,
  IconInbox,
  IconSearch,
  IconSparkles,
  IconArrowUp,
} from '@tabler/icons-react';

/** Decorative inbox preview; sample conversations are not live customer data. */
export function AuthIllustration() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-full px-8 py-10 select-none xl:px-14">
      <div className="mb-5 flex items-center justify-between text-xs font-medium tracking-wide text-[var(--text-secondary)]">
        <span>One workspace. Every conversation.</span>
        <IconArrowUpRight size={16} />
      </div>
      <div className="overflow-hidden rounded-[22px] border border-[var(--border-strong)] bg-white shadow-[0_24px_70px_-28px_rgba(12,22,52,0.3)]">
        <div className="flex items-center justify-between gap-4 bg-[var(--ink-950)] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <IconInbox size={18} stroke={1.6} className="text-white/70" />
            <span className="text-sm font-medium">Workspace inbox</span>
          </div>
          <IconSearch size={16} stroke={1.6} className="text-white/50" />
        </div>
        <div className="grid min-h-[310px] grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)]">
          <div className="border-r border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 p-3">
            <div className="mb-3 px-2 py-1 text-xs font-medium text-[var(--text-secondary)]">
              Conversations
            </div>
            <div className="space-y-1.5">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-xs font-medium text-[var(--blue-700)]">
                    AM
                  </span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">Alex M.</span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  A quick question about my order.
                </p>
                <IconBrandWhatsappFilled size={13} className="mt-2 text-[var(--text-tertiary)]" />
              </div>
              <div className="px-3 py-3">
                <p className="text-xs font-medium text-[var(--text-primary)]">Sam K.</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Thank you for your help.
                </p>
                <IconBrandInstagram size={13} className="mt-2 text-[var(--text-tertiary)]" />
              </div>
              <div className="border-t border-[var(--border-subtle)] px-3 py-3">
                <p className="text-xs font-medium text-[var(--text-primary)]">Jordan N.</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Can we arrange a delivery?
                </p>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
              <span className="text-xs font-medium text-[var(--text-primary)]">Alex M.</span>
              <span className="text-3xs text-[var(--text-secondary)]">WhatsApp</span>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-4 p-4">
              <p className="self-start rounded-2xl rounded-bl-sm bg-[var(--surface-sunken)] px-3.5 py-3 text-xs leading-relaxed text-[var(--text-primary)]">
                Hello! Could you help me check my delivery?
              </p>
              <p className="self-end rounded-2xl rounded-br-sm bg-[var(--ink-950)] px-3.5 py-3 text-xs leading-relaxed text-white">
                Of course. Let me check that for you.
              </p>
              <div className="flex items-center gap-2 text-3xs text-[var(--text-secondary)]">
                <IconSparkles size={13} stroke={1.5} className="shrink-0" />
                <span>Context stays with the conversation</span>
              </div>
            </div>
            <div className="m-3 mt-0 flex items-center justify-between gap-2 rounded-full border border-[var(--border-strong)] px-3 py-2.5">
              <span className="text-2xs text-[var(--text-tertiary)]">Write a reply...</span>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--blue-600)] text-white">
                <IconArrowUp size={13} />
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <IconBrandWhatsappFilled size={15} />
          WhatsApp
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconBrandInstagram size={15} />
          Instagram
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconBrandMessengerFilled size={15} />
          Messenger
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconMessageCircle size={15} />
          Web chat
        </span>
      </div>
      <div className="mt-10 border-t border-[var(--border-strong)] pt-7">
        <p className="font-serif text-[clamp(1.75rem,2.5vw,2.5rem)] leading-tight tracking-tight text-[var(--text-primary)]">
          A little clarity. A better conversation.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Bring your channels, team and customer context together in one considered space.
        </p>
      </div>
    </div>
  );
}
