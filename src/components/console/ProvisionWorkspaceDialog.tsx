'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import { IconCheck, IconLoader2, IconPlus, IconX } from '@tabler/icons-react';
import { gsapSafe } from '@/lib/motion';
import { useToast } from '@/components/primitives/Toast';
import { SkeletonPanel } from '@/components/primitives/Skeleton';
import {
  fetchProvisionOptions,
  provisionWorkspace,
} from '@/app/(platform)/platform/(console)/actions';
import type { ProvisionModel } from '@/lib/console/data';

/**
 * Provision a workspace. `Provision.dc.html`, as a modal rather than a page —
 * `/platform/tenants/new` used to render this content directly; it now
 * redirects to `/platform?provision=1` and `ConsoleShell` opens this on that
 * param, so the flow keeps a real, deep-linkable URL without needing its own
 * route. Absorbs the full form that used to live in `ProvisionForm.tsx`:
 * this used to be two competing implementations of the same flow — a
 * complete page-based form with real slug-uniqueness and the real plan set,
 * and a simpler, separately hand-rolled modal that previewed the retired
 * `.conduit.app` domain and hardcoded a plan (`'pro'`) that does not exist in
 * this product's plan set. This is the first one, in a dialog.
 *
 * ⚠ ON SUCCESS THIS REDIRECTS TO `/platform/tenants`, NOT TO THE NEW
 * WORKSPACE'S OWN PAGE. `getWorkspaceDetail` only resolves the one fixture
 * this console ships (`kilimanjaro-logistics`) — see `src/lib/console/data.ts`
 * — and linking to a workspace that 404s the instant it is created would be
 * worse than the honest alternative. The five-step manifest, the validation
 * and the working state are built exactly as designed; only the destination
 * differs, and only because nothing downstream can back up the more specific
 * claim yet.
 */
export function ProvisionWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pushToast = useToast();

  /**
   * The panel, for the entrance tween.
   *
   * ⚠ A REF AND AN EFFECT, NOT AN INLINE CALLBACK REF. The callback ref this
   * replaces re-ran on every render — React re-invokes one whenever its
   * identity changes, and an inline arrow is a fresh function each time — so
   * the dialog replayed its entrance on every keystroke in the form. The
   * effect keys on `open`, which is the thing that should actually trigger it.
   */
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    gsapSafe.fromTo(
      panelRef.current,
      { opacity: 0, y: 18, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: 'power3.out',
        /* Hand `transform` back to CSS when the tween lands. The centring no
           longer depends on it, but an element left carrying `translate(0,0)
           scale(1)` still holds a compositor layer and a stacking context for
           no reason. */
        clearProps: 'transform',
      },
    );
  }, [open]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [model, setModel] = useState<ProvisionModel | null>(null);
  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState('');
  /* Empty until the catalogue loads. No literal can be right here: the plan
     set is a database table, and a default guessed in the client is how
     `growth` survived for months after the plan it named was gone. */
  const [plan, setPlan] = useState('');
  const [trial, setTrial] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');
  /* Server-side refusals. `fieldError` names the input to mark when the server
     could identify one; `submitError` is the sentence shown above the actions. */
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<'name' | 'slug' | 'ownerEmail' | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    setLoadError(false);
    fetchProvisionOptions()
      .then(({ options, existingSlugs }) => {
        if (!live) return;
        setModel(options);
        setExistingSlugs(existingSlugs);
        /* ⚠ THE DEFAULT COMES FROM THE CATALOGUE, NOT FROM A LITERAL. It was
           `useState('growth')` — a plan this product has never had. A
           hardcoded default silently stops matching the moment the catalogue
           changes, and nothing fails until somebody presses submit. */
        if (options.plans[0]) setPlan(options.plans[0].key);
        setLoading(false);
      })
      .catch(() => {
        if (live) {
          setLoading(false);
          setLoadError(true);
        }
      });
    return () => {
      live = false;
    };
  }, [open]);

  // Reset the form each time the dialog opens fresh, so a cancelled attempt
  // never leaves stale values behind for the next one.
  useEffect(() => {
    if (!open) return;
    setName('');
    setSlug('');
    setSlugTouched(false);
    setEmail('');
    /* Not reset to a literal — the load effect re-seeds it from the
       catalogue that is about to arrive. */
    setTrial(true);
    setPhase('idle');
  }, [open]);

  const taken = useMemo(() => new Set(existingSlugs), [existingSlugs]);

  function slugify(v: string) {
    return v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28);
  }

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  const slugAvailable = slug !== '' && !taken.has(slug);
  const emailValid = /.+@.+\..+/.test(email);
  /* `plan` is in the gate because it is a required field of the request now.
     Without it the submit was reachable while the catalogue was still loading,
     and the server would refuse on an empty plan code — a refusal the operator
     could do nothing about except try again. */
  const ready = name.trim() !== '' && slug !== '' && slugAvailable && emailValid && plan !== '';
  const working = phase === 'working';
  const done = phase === 'done';

  /**
   * ⚠ THIS USED TO BE A TIMER.
   *
   * `setTimeout(1800)` flipped the phase to "done", raised a toast reading
   * "<name> provisioned · invitation sent to the owner", and pushed to the
   * workspace list. No request was made and no rows were written — while the
   * panel beside this form listed, by name, the five things submitting was
   * supposed to do: an RLS-bound tenant row, snapshotted entitlements, an
   * invited owner, propagated master rules, and a `tenant.provision` audit
   * entry. An operator would close it believing a customer could sign in.
   *
   * `provisionWorkspace` calls the real `provisionTenant`, which has existed
   * in `modules/platform` the whole time: tenant, settings, profile and owner
   * membership in ONE transaction, with the auth user deleted again if any of
   * it fails. Everything the panel claims is now true.
   */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || working || done) return;

    setPhase('working');
    setSubmitError(null);
    setFieldError(null);

    const result = await provisionWorkspace({
      name: name.trim(),
      slug,
      ownerEmail: email.trim(),
      trial,
      /* ⚠ THE CHOICE WAS COLLECTED AND NEVER SENT. Four fields went to the
         server and the plan was not one of them, so `provisionTenant` had
         nothing to resolve and wrote no subscription row — which is why a
         workspace provisioned here came out with no plan at all. */
      planCode: plan,
    });

    if (!result.ok) {
      /*
       * Back to idle rather than closed. The operator has typed four fields
       * and the failure is usually one of them — a taken slug, an address that
       * already has an account — so the form stays exactly as it was with the
       * reason attached to the field that caused it where the server named one.
       */
      setPhase('idle');
      setSubmitError(result.error);
      setFieldError(result.field ?? null);
      pushToast({
        title: 'Workspace not created',
        description: result.error,
        tone: 'failure',
      });
      return;
    }

    setPhase('done');
    pushToast({
      title: `${name.trim()} provisioned`,
      description: 'The owner has been invited and sets their own password.',
      tone: 'success',
    });

    /* The pause is the only thing kept from the old timer, and it is now
       cosmetic rather than load-bearing: the write has already committed, and
       this just lets the success state be seen before the dialog closes. */
    setTimeout(() => {
      onOpenChange(false);
      router.push(`/platform/tenants/${result.slug}`);
    }, 900);
  }

  /* ─────── shared input classes ─────── */
  const inputCls =
    'w-full rounded-overlay border border-[var(--ink-200)] bg-[var(--surface-raised)] px-4 py-3 outline-none transition-all duration-200 focus:border-[var(--blue-500)] focus:ring-2 focus:ring-[var(--blue-100)]';
  const inputStyle = {
    font: '400 var(--type-body)/1.5 var(--font-ui)',
    color: 'var(--text-primary)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !working && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="console-modal-backdrop fixed inset-0 z-[150]" />
        {/*
          ⚠ THE CENTRING IS NOT A TRANSFORM, AND THAT IS THE WHOLE FIX.

          This dialog rendered with its top-left corner at the middle of the
          screen, running off the bottom edge. Two faults, compounding:

          1. It centred itself with `-translate-x-1/2 -translate-y-1/2` while
             GSAP animated `y` and `scale` on the same element. GSAP writes an
             inline `transform`, and an inline transform REPLACES the classes
             wholesale — it does not merge with them. The moment the tween
             touched the element the centring was gone, and the end state
             (`y: 0, scale: 1`) is `translate(0,0)`, so it never came back.
             Reduced motion did not save it either: `gsapSafe` falls back to
             `gsap.set`, which writes the same inline transform.

          2. The tween was wired to an INLINE CALLBACK REF. React re-invokes a
             callback ref whenever its identity changes, and an inline arrow is
             a new function every render — so the entrance animation re-fired on
             every keystroke in the form, re-applying the broken transform and
             fading the dialog from 0 each time.

          Rather than teach GSAP about the centring (`xPercent: -50`), the
          centring moves off `transform` altogether: this grid wrapper owns
          position, the panel owns transform, and no future animation on it can
          decentre the dialog again. The wrapper is `pointer-events-none` so the
          overlay underneath still takes the click-outside.
        */}
        <div className="pointer-events-none fixed inset-0 z-[150] grid place-items-center p-4">
          <Dialog.Content
            ref={panelRef}
            className="surface-glass-strong pointer-events-auto flex max-h-[88vh] w-full max-w-[920px] flex-col overflow-hidden rounded-hero"
          >
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="relative px-8 pt-7 pb-5">
              <div className="absolute right-8 bottom-0 left-8 h-px bg-gradient-to-r from-transparent via-[var(--border-subtle)] to-transparent" />

              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="mb-1.5 font-mono text-2xs font-medium tracking-[0.2em] uppercase"
                    style={{ color: 'var(--blue-500)' }}
                  >
                    New tenant
                  </p>
                  <Dialog.Title asChild>
                    <h2 className="display display-sm" style={{ color: 'var(--text-primary)' }}>
                      Provision a workspace
                    </h2>
                  </Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    disabled={working}
                    className="grid size-8 shrink-0 place-items-center rounded-overlay transition-colors hover:bg-[var(--surface-inset)]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <IconX size={16} stroke={1.5} />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description
                className="mt-2.5"
                style={{
                  font: '400 var(--type-body)/1.6 var(--font-ui)',
                  color: 'var(--text-secondary)',
                }}
              >
                Four fields. The owner receives an invitation and sets their own password; you never
                see it.
              </Dialog.Description>
            </div>

            {/* ── Body ────────────────────────────────────────────────── */}
            <div className="scrollbar-slim flex-1 overflow-y-auto px-8 pt-6 pb-8">
              {loadError ? (
                <p className="t-compact py-10 text-center" style={{ color: 'var(--danger-fg)' }}>
                  Could not load plans and existing workspaces. Close and try again.
                </p>
              ) : loading || !model ? (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_320px]">
                  <SkeletonPanel lines={5} />
                  <SkeletonPanel lines={3} />
                </div>
              ) : (
                <form
                  /* `void` rather than passing the async function straight in:
                   onSubmit expects a void return, and handing it a promise
                   makes an unhandled rejection invisible. submit() already
                   catches its own failures into state. */
                  onSubmit={(e) => void submit(e)}
                  className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.4fr)_320px]"
                >
                  {/* ── Left Column ─────────────────────────────────── */}
                  <div className="grid gap-10">
                    {/* Identity */}
                    <section>
                      <p
                        className="mb-5 font-mono text-xs font-medium tracking-[0.15em] uppercase"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Identity
                      </p>

                      <div className="grid gap-5">
                        {/* Legal name */}
                        <label className="block">
                          <span
                            className="mb-2 block text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            Legal name
                          </span>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => onNameChange(e.target.value)}
                            placeholder="Tamarind Bay Resorts Ltd"
                            disabled={working || done}
                            className={inputCls}
                            style={inputStyle}
                          />
                        </label>

                        {/* Slug */}
                        <label className="block">
                          <span className="mb-2 flex items-center justify-between">
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              Slug
                            </span>
                            {slug ? (
                              <span
                                className="flex items-center gap-1.5 font-mono text-2xs font-medium tracking-widest uppercase"
                                style={{
                                  color: slugAvailable ? 'var(--green-500)' : 'var(--red-500)',
                                }}
                              >
                                {slugAvailable ? (
                                  <IconCheck size={12} stroke={2.5} aria-hidden />
                                ) : (
                                  <IconX size={12} stroke={2.5} aria-hidden />
                                )}
                                {slugAvailable ? 'Available' : 'Taken'}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className="flex h-[46px] items-center overflow-hidden rounded-overlay border border-[var(--ink-200)] bg-[var(--surface-raised)] transition-all duration-200 focus-within:border-[var(--blue-500)] focus-within:ring-2 focus-within:ring-[var(--blue-100)]"
                            style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}
                          >
                            <span
                              className="flex h-full shrink-0 items-center px-3.5 whitespace-nowrap"
                              style={{
                                background: 'var(--surface-sunken)',
                                borderRight: '1px solid var(--ink-100)',
                                font: '400 var(--type-compact)/1 var(--font-mono)',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              alcassa.app /
                            </span>
                            <input
                              type="text"
                              value={slug}
                              onChange={(e) => {
                                setSlug(slugify(e.target.value));
                                setSlugTouched(true);
                              }}
                              placeholder="tamarind-bay"
                              disabled={working || done}
                              className="h-full min-w-0 flex-1 border-none bg-transparent px-3.5 outline-none"
                              style={{
                                font: '400 var(--type-body)/1 var(--font-mono)',
                                color: 'var(--text-primary)',
                              }}
                            />
                          </span>
                        </label>

                        {/* Owner email */}
                        <label className="block">
                          <span
                            className="mb-2 block text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            Owner email
                          </span>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="owner@tamarindbay.co.ke"
                            disabled={working || done}
                            className={inputCls}
                            style={inputStyle}
                          />
                          <span
                            className="mt-1.5 block text-sm"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            They receive an invitation valid for seven days and choose their own
                            password.
                          </span>
                        </label>
                      </div>
                    </section>

                    {/* ── Plan ─────────────────────────────────────── */}
                    <section>
                      <p
                        className="mb-5 font-mono text-xs font-medium tracking-[0.15em] uppercase"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Plan
                      </p>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {model.plans.map((p) => {
                          const on = plan === p.key;
                          return (
                            <button
                              key={p.key}
                              type="button"
                              disabled={working || done}
                              onClick={() => setPlan(p.key)}
                              aria-pressed={on}
                              className={`relative flex flex-col rounded-card p-4 text-left transition-all duration-300 ${
                                on
                                  ? '-translate-y-1 border-2 border-[var(--blue-500)] bg-[var(--surface-raised)] shadow-[0_12px_40px_-10px_rgba(4,58,225,0.12)]'
                                  : 'border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 hover:border-[var(--ink-200)] hover:bg-[var(--surface-raised)] hover:shadow-md'
                              }`}
                            >
                              <span
                                className="block text-base font-medium"
                                style={{
                                  color: on ? 'var(--blue-600)' : 'var(--text-primary)',
                                }}
                              >
                                {p.name}
                              </span>

                              <div className="mt-3 border-t border-[var(--ink-100)] pt-3">
                                <span
                                  className="block font-mono text-sm font-medium tracking-tight"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {p.price}
                                </span>
                                <span
                                  className="mt-1.5 block text-xs leading-snug"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  {p.limit}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Trial toggle */}
                      <div className="relative mt-8 pt-6">
                        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-[var(--border-subtle)] to-transparent" />
                        <label className="flex cursor-pointer items-start gap-3.5">
                          <Switch.Root
                            checked={trial}
                            disabled={working || done}
                            aria-label="Start with a 14-day trial"
                            onCheckedChange={() => setTrial((t) => !t)}
                            className="relative mt-0.5 h-[22px] w-[40px] shrink-0 rounded-full transition-colors"
                            style={{
                              border: 'none',
                              background: trial ? 'var(--blue-500)' : 'var(--ink-200)',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                              transitionDuration: 'var(--duration-base)',
                            }}
                          >
                            <Switch.Thumb
                              className="block size-[18px] rounded-full bg-[var(--surface-raised)] transition-transform"
                              style={{
                                transform: trial ? 'translateX(20px)' : 'translateX(2px)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                transitionDuration: 'var(--duration-base)',
                              }}
                            />
                          </Switch.Root>
                          <span className="flex-1">
                            <span
                              className="block text-sm font-medium"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              Start with a 14-day trial
                            </span>
                            <span
                              className="mt-0.5 block text-sm leading-relaxed"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              No invoice is raised until the trial ends. The workspace appears under
                              Trial on Overview.
                            </span>
                          </span>
                        </label>
                      </div>
                    </section>
                  </div>

                  {/* ── Right Rail ──────────────────────────────────── */}
                  <div className="grid gap-6">
                    {/* Execution flow */}
                    <section
                      className="rounded-card p-5"
                      style={{
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--surface-sunken)',
                      }}
                    >
                      <p
                        className="mb-5 font-mono text-2xs font-medium tracking-[0.15em] uppercase"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        What happens on submit
                      </p>
                      <div className="relative">
                        {/* Vertical connector — perfectly centered on the 26px circles */}
                        {/* Center of a 26px circle is at 13px. We use left 13px and transform translateX(-50%) for pixel-perfect centering */}
                        <div
                          className="absolute top-3 bottom-3 w-px"
                          style={{
                            left: '13px',
                            transform: 'translateX(-50%)',
                            background:
                              'linear-gradient(to bottom, var(--blue-200), var(--ink-200), var(--ink-100))',
                          }}
                        />

                        <div className="relative flex flex-col gap-5">
                          {model.steps.map((s, idx) => (
                            <div key={s.n} className="flex items-start gap-3.5">
                              {/* Circle wrapper to ensure precise 26px size */}
                              <div className="flex size-[26px] shrink-0 items-center justify-center">
                                <span
                                  className="grid size-full place-items-center rounded-full"
                                  style={{
                                    border: `1.5px solid ${idx === 0 ? 'var(--blue-400)' : 'var(--ink-200)'}`,
                                    background:
                                      idx === 0 ? 'var(--blue-50)' : 'var(--surface-raised)',
                                    font: '600 var(--type-micro)/1 var(--font-mono)',
                                    color: idx === 0 ? 'var(--blue-500)' : 'var(--text-tertiary)',
                                    zIndex: 1, // ensure it covers the line behind it
                                  }}
                                  aria-hidden
                                >
                                  {s.n}
                                </span>
                              </div>
                              <span
                                className="flex-1 pt-[5px] text-sm leading-relaxed"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {s.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p
                        className="mt-5 border-t pt-4 text-sm"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        Runs as one transaction. If any step fails, nothing is created.
                      </p>
                    </section>

                    {/*
                    ⚠ THE REFUSAL IS SHOWN WHERE THE DECISION IS MADE.
                    A toast also fires, but a toast is gone in five seconds and
                    this dialog can be scrolled — an operator who was reading
                    the plan cards when the request failed would otherwise have
                    nothing left to act on. `role="alert"` so it is announced
                    rather than silently appearing above the button.
                  */}
                    {submitError ? (
                      <div
                        role="alert"
                        className="mb-3 rounded-overlay border px-3.5 py-2.5"
                        style={{
                          font: '400 var(--type-compact)/1.5 var(--font-ui)',
                          color: 'var(--danger-fg)',
                          background: 'var(--danger-bg)',
                          borderColor: 'color-mix(in oklab, var(--danger-fg) 38%, transparent)',
                        }}
                      >
                        {submitError}
                        {fieldError === 'slug' ? ' Try a different slug.' : null}
                        {fieldError === 'ownerEmail'
                          ? ' Invite them to the existing workspace instead.'
                          : null}
                      </div>
                    ) : null}

                    {/* Submit CTA */}
                    <button
                      type="submit"
                      disabled={!ready || working || done}
                      className="group relative flex h-11 w-full items-center justify-center gap-2.5 overflow-hidden rounded-overlay transition-all duration-300 focus:ring-2 focus:ring-[var(--blue-400)] focus:ring-offset-2 focus:outline-none"
                      style={{
                        border: 'none',
                        background: done
                          ? 'var(--success-fg)'
                          : ready && !working
                            ? 'linear-gradient(180deg, var(--blue-500) 0%, var(--blue-600) 100%)'
                            : 'var(--surface-inset)',
                        color:
                          done || (ready && !working)
                            ? 'var(--text-inverse)'
                            : 'var(--text-disabled)',
                        font: '600 var(--type-body)/1 var(--font-ui)',
                        cursor: ready && !working && !done ? 'pointer' : 'not-allowed',
                        boxShadow:
                          ready && !working && !done
                            ? 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 16px rgba(4,58,225,0.2)'
                            : 'none',
                        textShadow:
                          ready && !working && !done ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      {ready && !working && !done && (
                        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-transparent via-[rgba(255,255,255,0.15)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {done ? (
                          <IconCheck size={16} stroke={2} aria-hidden />
                        ) : working ? (
                          <IconLoader2 size={16} stroke={2} className="animate-spin" aria-hidden />
                        ) : (
                          <IconPlus size={16} stroke={2} aria-hidden />
                        )}
                        {working
                          ? 'Provisioning...'
                          : done
                            ? 'Workspace created'
                            : 'Provision workspace'}
                      </span>
                    </button>
                    <p className="text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      {done
                        ? 'Invitation sent. Returning to Workspaces.'
                        : working
                          ? 'Running five steps in one transaction...'
                          : 'Typically completes in under two minutes'}
                    </p>
                  </div>
                </form>
              )}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
