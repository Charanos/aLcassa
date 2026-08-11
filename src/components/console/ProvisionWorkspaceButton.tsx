'use client';

import React, { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { ProvisionWorkspaceDialog } from './ProvisionWorkspaceDialog';
import { useRouter } from 'next/navigation';

export function ProvisionWorkspaceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleProvision(_: { name: string; region: string; plan: string }) {
    // Simulate API call to show the pending state nicely
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsOpen(false);
    
    // Refresh the router to reflect new state (mock)
    router.refresh();
    
    return { ok: true as const };
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        style={{
          background: 'var(--blue-500)',
          color: '#ffffff',
          fontWeight: 500
        }}
      >
        <IconPlus size={15} stroke={1.5} aria-hidden />
        Provision workspace
      </button>

      {isOpen && (
        <ProvisionWorkspaceDialog
          onCancel={() => setIsOpen(false)}
          onProvision={handleProvision}
        />
      )}
    </>
  );
}
