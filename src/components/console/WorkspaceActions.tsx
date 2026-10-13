'use client';

import { useState } from 'react';
import { IconExternalLink } from '@tabler/icons-react';
import { StartSessionDialog } from './StartSessionDialog';
import { WorkspaceStatusControl } from './WorkspaceStatusControl';
import type { WorkspaceStatus } from '@/lib/console/data';
import { useToast } from '@/components/primitives/Toast';
import type { ConsoleWorkspace } from './types';

/** Support entry and the shared audited workspace-status control. */
export function WorkspaceActions({
  workspace,
  status,
  onStartSession,
}: {
  workspace: ConsoleWorkspace;
  status: WorkspaceStatus;
  onStartSession: (input: {
    tenantId: string;
    tenantName: string;
    reason: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const pushToast = useToast();
  const [sessionOpen, setSessionOpen] = useState(false);
  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setSessionOpen(true)}
          className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
          }}
        >
          <IconExternalLink size={15} stroke={1.5} aria-hidden />
          Support session
        </button>
        <WorkspaceStatusControl workspace={workspace} status={status} />
      </div>

      {sessionOpen ? (
        <StartSessionDialog
          workspace={workspace}
          onCancel={() => setSessionOpen(false)}
          onConfirm={async (reason) => {
            const result = await onStartSession({
              tenantId: workspace.id,
              tenantName: workspace.name,
              reason,
            });
            if (result.ok) {
              setSessionOpen(false);
              pushToast({
                title: `Support session started in ${workspace.name}`,
                description:
                  'The visit is recorded in customer Activity. Open it from Support sessions.',
                tone: 'success',
              });
            }
            return result;
          }}
        />
      ) : null}
    </>
  );
}
