'use client';

import { useEffect, useRef, useState } from 'react';
import { IconDots, IconLogout, IconSettings, IconUserCircle } from '@tabler/icons-react';

export type AdminProfile = {
  name: string;
  email: string;
  role: string;
  initials: string;
};

/**
 * 03 §9 Tier 6 (RoleBadge) + Tier 4 (DropdownMenu), composed for the sidebar
 * footer. Replaces the reference's avatar-stack-plus-Invite pattern: this is
 * Brian's internal ops console, not a shared team workspace, so the anchor
 * here is his own identity and the account actions he actually reaches for —
 * settings and sign out — not collaborator invites.
 */
export function AdminProfileCard({
  profile,
  collapsed = false,
}: {
  profile: AdminProfile;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      data-slot="admin-profile-card"
      className="relative mt-auto border-t px-2 py-2"
      style={{ borderColor: 'var(--ink-100)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? `${profile.name} · ${profile.role}` : undefined}
        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-chip px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-[var(--surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{ background: 'var(--blue-500)', color: '#ffffff' }}
        >
          <span
            className="t-eyebrow leading-none"
            style={{ letterSpacing: 0, fontSize: 'var(--type-micro)' }}
          >
            {profile.initials}
          </span>
        </span>
        {!collapsed && (
          <>
            <span className="flex min-w-0 flex-1 flex-col leading-none">
              <span className="t-compact truncate font-medium text-[var(--text-primary)]">
                {profile.name}
              </span>
              <span className="t-caption truncate text-[var(--text-tertiary)] opacity-60">
                {profile.role}
              </span>
            </span>
            <IconDots size={16} stroke={1.75} className="shrink-0 text-[var(--text-tertiary)]" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          data-slot="admin-profile-menu"
          className="absolute bottom-[calc(100%+6px)] left-2 z-50 w-56 overflow-hidden rounded-panel border py-1"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-overlay)',
          }}
        >
          <div className="border-b px-3 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="t-compact truncate font-medium text-[var(--text-primary)]">
              {profile.name}
            </p>
            <p className="t-caption truncate text-[var(--text-tertiary)] opacity-60">
              {profile.email}
            </p>
          </div>
          <button
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 hover:bg-[var(--surface-inset)]"
          >
            <IconUserCircle size={16} stroke={1.75} className="text-[var(--text-tertiary)]" />
            <span className="t-compact text-[var(--text-primary)]">View profile</span>
          </button>
          <button
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 hover:bg-[var(--surface-inset)]"
          >
            <IconSettings size={16} stroke={1.75} className="text-[var(--text-tertiary)]" />
            <span className="t-compact text-[var(--text-primary)]">Console settings</span>
          </button>
          <div className="my-1 border-t" style={{ borderColor: 'var(--border-subtle)' }} />
          {/*
            ⚠ A FORM POST, AND IT USED TO BE A BUTTON WITH NO HANDLER — so
            this control did nothing at all. Signing out changes state, so it
            is a POST rather than a link or an onClick: the cookies are
            `sameSite: 'lax'`, which does not travel on a cross-site POST, so
            another site cannot forge the request. It also means leaving does
            not depend on JavaScript having loaded.
          */}
          <form method="post" action="/api/v1/auth/sign-out" className="contents">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 hover:bg-[var(--surface-inset)]"
            >
              <IconLogout size={16} stroke={1.75} style={{ color: 'var(--red-500)' }} />
              <span className="t-compact" style={{ color: 'var(--red-500)' }}>
                Sign out
              </span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
