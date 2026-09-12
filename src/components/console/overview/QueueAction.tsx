'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconLoader2, IconLock } from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { useToast } from '@/components/primitives/Toast';
import { raiseWorkspacePlanFromQueue } from '@/app/(platform)/platform/(console)/queue-actions';
import type { QueueAction as QueueActionModel } from '@/lib/console/data';

/**
 * The one control on a queue card. 17 §7.
 *
 * ⚠ THIS IS THE ONLY CLIENT COMPONENT IN THE QUEUE, and it is deliberately the
 * smallest unit that needs to be one.
 *
 * A card is a server component: its icon, name, prose, badge and meta render
 * once and ship as HTML. Only the button crosses the boundary, and only because
 * it owns a dialog, a pending state and a toast. Making the CARD a client
 * component would have pushed every workspace's prose through the serialisation
 * boundary to gain a button.
 *
 * ⚠ THE THREE OUTCOMES ARE THREE DIFFERENT SURFACES, on purpose.
 *
 *   WHILE IT RUNS — the button itself. 03 §20: "toast for every action → toast
 *   for asynchronous outcomes only." A spinner inside the control the reader
 *   just pressed is where they are already looking.
 *
 *   ON FAILURE — inline, inside the dialog, which stays open. A toast that
 *   reports a refusal while the dialog closes takes the explanation away from
 *   the form that caused it and leaves the reader nothing to correct.
 *
 *   ON SUCCESS — a toast, because by then the dialog has closed and the card
 *   they were looking at has been revalidated out from under them. That is the
 *   asynchronous outcome the rule reserves toasts for.
 *
 * ⚠ THE UNION IS DISPATCHED INTO SEPARATE COMPONENTS rather than branched
 * inside one. Narrowing a prop does not survive into a callback, so a single
 * component would need a cast to read `planCode` inside its own submit
 * handler — and a cast is how an action ends up sending an empty plan code.
 */
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
      return <UnavailableAction label={action.label} reason={action.unavailable} />;

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

/**
 * ⚠ THE REASON SITS BESIDE THE CONTROL, NOT IN A TOOLTIP.
 *
 * 17 §6.4 permits a disabled control only when it says why, and a `title`
 * alone fails that for anybody not using a pointer. It stays on one line so a
 * card with an unavailable action is the same height as one with a live
 * action — which is what keeps the queue reading as a single list rather than
 * as four cards of different weights.
 */
function UnavailableAction({ label, reason }: { label: string; reason: string }) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2.5">
      <button
        type="button"
        disabled
        className={`${PRIMARY_CLASS} gap-1.5`}
        style={{
          background: 'var(--surface-sunken)',
          color: 'var(--text-disabled)',
          border: '1px solid var(--border-subtle)',
          fontWeight: 600,
          cursor: 'not-allowed',
          boxShadow: 'none',
        }}
      >
        <IconLock size={13} stroke={1.75} aria-hidden />
        {label}
      </button>
      <span className="t-caption min-w-0" style={{ color: 'var(--text-tertiary)' }}>
        {reason}
      </span>
    </span>
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

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await raiseWorkspacePlanFromQueue({
        slug,
        planCode,
        planName,
        observation,
      });

      if (result.ok) {
        setOpen(false);
        toast({ tone: 'success', title: 'Plan changed', description: result.message });
        /* The queue is derived from the pressure this relieved, so the card
           should not survive the change that fixed it. */
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
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
        /*
          ⚠ ONE SENTENCE, NAMING THE CONSEQUENCE RATHER THAN THE ACTION.
          03 §9: "title, one-sentence consequence, cancel then confirm." What a
          reader needs before pressing this is not "this assigns a plan" — the
          button says that — but that it changes what a customer pays, and that
          the customer will be able to read why.
        */
        consequence="This changes what they are charged from the next period, and it takes effect immediately."
        /*
          ⚠ WHAT IT RECORDS IS SHOWN BEFORE IT RUNS, NOT DISCOVERED AFTERWARDS.
          09 §4: every platform action against a workspace lands in BOTH logs
          in the same transaction that performs it. On a product whose central
          promise is that the platform cannot touch a customer silently, the
          moment to state that is while the operator still has a Cancel button.
        */
        details={
          <div
            className="rounded-panel px-3.5 py-3"
            style={{ background: 'var(--surface-sunken)' }}
          >
            <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
              Recorded in two places, in the same transaction as the change:
            </p>
            <ul className="mt-1.5 grid gap-1">
              <AuditLine>this platform&rsquo;s audit log, with your name and this queue as the origin</AuditLine>
              <AuditLine>
                {workspace}&rsquo;s own activity log, where they can read the reason
              </AuditLine>
            </ul>
          </div>
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
  't-compact inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-lg px-4 whitespace-nowrap transition-all duration-300 hover:brightness-110 disabled:cursor-default disabled:hover:brightness-100';

const PRIMARY_STYLE: React.CSSProperties = {
  background: 'var(--blue-500)',
  color: '#ffffff',
  fontWeight: 600,
  boxShadow:
    '0 4px 12px color-mix(in srgb, var(--blue-500) 22%, transparent), inset 0 1px 1px rgba(255,255,255,0.2)',
};

/** One destination in the "what this records" list. */
function AuditLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="t-caption flex gap-2" style={{ color: 'var(--text-secondary)' }}>
      <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>
        ·
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
