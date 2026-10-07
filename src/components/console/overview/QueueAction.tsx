'use client';

import { useState, useTransition } from 'react';
import Link from '@/components/structure/NavigationLink';
import { useRouter } from 'next/navigation';
import { IconLoader2, IconLock } from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { useToast } from '@/components/primitives/Toast';
import {
  previewQueueWorkspacePlan,
  raiseWorkspacePlanFromQueue,
} from '@/app/(platform)/platform/(console)/queue-actions';
import type { PlanChangePreview } from '@/modules/platform';
import type { QueueAction as QueueActionModel } from '@/lib/console/data';

/** Keep queue cards server-rendered; this control owns preview, confirmation and asynchronous feedback. */
export function QueueAction({
  action,
  slug,
  workspace,
  observation,
}: {
  action: QueueActionModel;
  slug: string;
  workspace: string;
  /** The card's own detail line, written into the customer's audit entry. */
  observation: string;
}) {
  switch (action.kind) {
    case 'open':
    case 'choose_plan':
      return (
        <Link href={action.href} className={PRIMARY_CLASS} style={PRIMARY_STYLE}>
          {action.label}
        </Link>
      );

    case 'retry_charge':
    case 'write_off':
      return <UnavailableAction label={action.label} />;

    case 'assign_plan':
      return (
        <AssignPlanAction
          label={action.label}
          planCode={action.planCode}
          planName={action.planName}
          slug={slug}
          workspace={workspace}
          observation={observation}
        />
      );
  }
}

/** The card displays the full reason for unavailable actions so it remains readable on touch and keyboard. */
function UnavailableAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="t-compact inline-flex h-8 shrink-0 cursor-not-allowed items-center justify-center gap-1.5 rounded-overlay px-3.5"
      style={{
        background: 'var(--surface-inset)',
        color: 'var(--text-tertiary)',
        border: '1px solid var(--border-subtle)',
        fontWeight: 500,
      }}
    >
      <IconLock size={14} stroke={1.75} aria-hidden />
      {label}
    </button>
  );
}

function AssignPlanAction({
  label,
  planCode,
  planName,
  slug,
  workspace,
  observation,
}: {
  label: string;
  planCode: string;
  planName: string;
  slug: string;
  workspace: string;
  observation: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);

  function review() {
    setError(null);
    setPreview(null);
    setOpen(true);
    startTransition(async () => {
      const result = await previewQueueWorkspacePlan({ slug, planCode });
      if (result.ok) setPreview(result.data);
      else setError(result.error);
    });
  }

  function confirm() {
    if (!preview || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await raiseWorkspacePlanFromQueue({
        slug,
        planCode,
        planName,
        observation,
        expectedPreview: preview.fingerprint,
      });

      if (result.ok) {
        setOpen(false);
        toast({ tone: 'success', title: 'Plan changed', description: result.message });
        /* The queue is derived from the pressure this relieved, so the card
           should not survive the change that fixed it. */
        router.refresh();
      } else {
        setPreview(null);
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={review}
        disabled={pending}
        className={`${PRIMARY_CLASS} gap-2`}
        style={PRIMARY_STYLE}
      >
        {pending ? (
          <IconLoader2
            size={13}
            stroke={2}
            aria-hidden
            className="animate-spin motion-reduce:animate-none"
            style={{ animationDuration: '900ms' }}
          />
        ) : null}
        {label}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          /* A dialog that closes mid-flight leaves the reader unable to see
             how the thing they started turned out. */
          if (pending) return;
          setOpen(next);
          if (!next) setError(null);
        }}
        title={`Move ${workspace} to ${planName}?`}
        /* State immediate subscription effects without implying automated payment collection. */
        consequence="The subscription value and allowances change immediately. This records the plan without collecting payment."
        disabled={!preview}
        details={
          preview ? (
            <div className="rounded-panel p-3" style={{ background: 'var(--surface-sunken)' }}>
              <p className="t-caption" style={{ color: 'var(--text-secondary)' }}>
                {preview.rows.some((row) => row.strands)
                  ? 'These allowances would be below current usage or no longer included:'
                  : 'Current usage fits the selected plan. Active allowance overrides remain in effect.'}
              </p>
              <p className="t-caption mt-2" style={{ color: 'var(--text-tertiary)' }}>
                The change and its reason are recorded in platform and customer activity.
              </p>
              {preview.rows
                .filter((row) => row.strands)
                .map((row) => (
                  <p
                    key={row.key}
                    className="t-caption mt-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {row.displayName}:{' '}
                    {row.kind === 'feature'
                      ? 'no longer included'
                      : `uses ${row.current}, new limit ${row.to ?? 'unlimited'}`}
                  </p>
                ))}
            </div>
          ) : error ? (
            <button
              type="button"
              onClick={review}
              disabled={pending}
              className="t-caption text-blue-600 underline underline-offset-4"
            >
              Review current allowances
            </button>
          ) : null
        }
        confirmLabel={`Move to ${planName}`}
        tone="primary"
        onConfirm={confirm}
        loading={pending}
        error={error}
      />
    </>
  );
}

/**
 * The primary control's geometry, shared by all three renderings so a link, a
 * button and a refusal occupy exactly the same box. A queue whose rows shift
 * height depending on what each card can do reads as four components rather
 * than one list.
 */
const PRIMARY_CLASS =
  't-compact inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-overlay px-4 whitespace-nowrap transition-all duration-300 hover:brightness-110 disabled:cursor-default disabled:hover:brightness-100';

const PRIMARY_STYLE: React.CSSProperties = {
  background: 'var(--blue-500)',
  color: 'var(--text-inverse)',
  fontWeight: 500,
  boxShadow:
    '0 4px 12px color-mix(in oklab, var(--blue-500) 22%, transparent), inset 0 1px 1px color-mix(in oklab, var(--ink-0) 20%, transparent)',
};
