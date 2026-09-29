'use client';

import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { ProvisionWorkspaceDialog } from './ProvisionWorkspaceDialog';

export function ProvisionWorkspaceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative inline-flex h-[36px] items-center justify-center gap-2 overflow-hidden rounded-full px-5 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(56,182,255,0.3)] focus:ring-2 focus:ring-[var(--blue-400)] focus:ring-offset-2 focus:ring-offset-[var(--surface-base)] focus:outline-none"
        style={{
          background: 'linear-gradient(180deg, var(--blue-500) 0%, var(--blue-600) 100%)',
          color: 'var(--text-inverse)',
          fontWeight: 500,
          boxShadow: 'inset 0 1px 0px rgba(255,255,255,0.25), 0 2px 10px rgba(56, 182, 255, 0.2)',
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          fontSize: '13px',
          letterSpacing: '0.01em',
        }}
      >
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-transparent via-[rgba(255,255,255,0.2)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <IconPlus size={16} stroke={2.5} aria-hidden className="relative z-10" />
        <span className="relative z-10">Provision workspace</span>
      </button>

      <ProvisionWorkspaceDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
