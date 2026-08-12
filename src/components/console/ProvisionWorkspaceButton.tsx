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
        className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        style={{
          background: 'var(--blue-500)',
          color: '#ffffff',
          fontWeight: 500,
        }}
      >
        <IconPlus size={15} stroke={1.5} aria-hidden />
        Provision workspace
      </button>

      <ProvisionWorkspaceDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
