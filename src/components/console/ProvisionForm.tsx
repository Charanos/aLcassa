'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { IconCheck, IconPlus, IconX } from '@tabler/icons-react';
import * as Switch from '@radix-ui/react-switch';
import type { ProvisionModel } from '@/lib/console/data';

/**
 * Provision a workspace. `Provision.dc.html`.
 *
 * ⚠ THE SLUG CHECK READS REAL WORKSPACE SLUGS, not a hardcoded taken-list.
 * `existingSlugs` comes from the same `getWorkspaces()` read the list and
 * Overview already use, so "taken" here means the same thing it means
 * everywhere else in the console — one source of truth for what already
 * exists, not a fixture invented for this one form.
 *
 * ⚠ THE DOMAIN PREVIEW READS `alcassa.app`, and this is worth stating
 * explicitly because it is easy to get wrong: a workspace slug preview is
 * exactly the kind of string that quietly keeps a retired brand name alive
 * in a corner nobody proofreads. This one doesn't.
 *
 * ⚠ ON SUCCESS THIS REDIRECTS TO `/platform/tenants`, NOT TO THE NEW
 * WORKSPACE'S OWN PAGE. The design's copy says "redirecting to the
 * workspace," which is the right instinct for a real backend and the wrong
 * promise for this one: `getWorkspaceDetail` only resolves the one fixture
 * this console set (`kilimanjaro-logistics`), and linking to a workspace that
 * 404s the instant it's created would be worse than the honest alternative.
 * The submit flow itself — validation, the five-step manifest, the working
 * state — is built exactly as designed; only the destination changed, and
 * only because nothing downstream can back up the more specific claim yet.
 */
export function ProvisionForm({
  model,
  existingSlugs,
}: {
  model: ProvisionModel;
  existingSlugs: string[];
}) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('growth');
  const [trial, setTrial] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');

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
  const ready = name.trim() !== '' && slug !== '' && slugAvailable && emailValid;
  const working = phase === 'working';
  const done = phase === 'done';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || working || done) return;
    setPhase('working');
    setTimeout(() => {
      setPhase('done');
      setTimeout(() => router.push('/platform/tenants'), 1400);
    }, 1800);
  }

  return (
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-5">
        {/* ── Identity ─────────────────────────────────────────────────── */}
        <section
          className="rounded-overlay p-5"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
          }}
        >
          <p className="t-eyebrow mb-5" style={{ color: 'var(--text-tertiary)' }}>
            Identity
          </p>

          <label className="block">
            <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
              Legal name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Tamarind Bay Resorts Ltd"
              disabled={working || done}
              className="t-body h-[38px] w-full rounded-chip px-3 outline-none"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--neu-inset)',
                color: 'var(--text-primary)',
              }}
            />
          </label>

          <label className="mt-4 block">
            <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
              Slug
            </span>
            <span
              className="flex h-[38px] items-center overflow-hidden rounded-chip"
              style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', boxShadow: 'var(--neu-inset)' }}
            >
              <span
                className="flex h-full shrink-0 items-center px-2.5 whitespace-nowrap"
                style={{
                  background: 'var(--surface-sunken)',
                  borderRight: '1px solid var(--border-subtle)',
                  font: '400 12.5px/1 var(--font-mono)',
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
                className="h-full min-w-0 flex-1 border-none bg-transparent px-2.5 outline-none"
                style={{ font: '400 var(--text-base)/1 var(--font-mono)', color: 'var(--text-primary)' }}
              />
              {slug ? (
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 px-3 whitespace-nowrap"
                  style={{
                    font: '400 var(--text-sm)/1 var(--font-ui)',
                    color: slugAvailable ? 'var(--success-fg)' : 'var(--danger-fg)',
                  }}
                >
                  {slugAvailable ? (
                    <IconCheck size={13} stroke={1.5} aria-hidden />
                  ) : (
                    <IconX size={13} stroke={1.5} aria-hidden />
                  )}
                  {slugAvailable ? 'available' : 'taken'}
                </span>
              ) : null}
            </span>
          </label>

          <label className="mt-4 block">
            <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
              Owner email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@tamarindbay.co.ke"
              disabled={working || done}
              className="h-[38px] w-full rounded-chip px-3 outline-none"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--neu-inset)',
                font: '400 var(--text-base)/1 var(--font-mono)',
                color: 'var(--text-primary)',
              }}
            />
            <span className="t-caption mt-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
              They receive an invitation valid for seven days and choose their own password.
            </span>
          </label>
        </section>

        {/* ── Plan ─────────────────────────────────────────────────────── */}
        <section
          className="rounded-overlay p-5"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
          }}
        >
          <p className="t-eyebrow mb-5" style={{ color: 'var(--text-tertiary)' }}>
            Plan
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {model.plans.map((p) => {
              const on = plan === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  disabled={working || done}
                  onClick={() => setPlan(p.key)}
                  aria-pressed={on}
                  className="rounded-panel px-3.5 py-3 text-left transition-colors"
                  style={{
                    border: `1px solid ${on ? 'var(--blue-500)' : 'var(--border-subtle)'}`,
                    background: on ? 'var(--blue-50)' : 'var(--surface-raised)',
                    boxShadow: on ? 'var(--neu-raised)' : undefined,
                  }}
                >
                  <span
                    className="block"
                    style={{ font: `${on ? 500 : 400} 13px/1.3 var(--font-ui)`, color: on ? 'var(--blue-600)' : 'var(--text-primary)' }}
                  >
                    {p.name}
                  </span>
                  <span className="mt-1.5 block" style={{ font: '400 12px/1.3 var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {p.price}
                  </span>
                  <span className="mt-2 block" style={{ font: '400 11.5px/1.4 var(--font-ui)', color: 'var(--text-tertiary)' }}>
                    {p.limit}
                  </span>
                </button>
              );
            })}
          </div>

          <label
            className="mt-5 flex items-start gap-2.5 border-t pt-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Switch.Root
              checked={trial}
              disabled={working || done}
              aria-label="Start with a 14-day trial"
              onCheckedChange={() => setTrial((t) => !t)}
              className="relative mt-0.5 h-5 w-[34px] shrink-0 rounded-full transition-colors"
              style={{
                border: 'none',
                background: trial ? 'var(--blue-500)' : 'var(--surface-inset)',
                boxShadow: 'var(--neu-inset)',
                transitionDuration: 'var(--duration-base)',
              }}
            >
              <Switch.Thumb
                className="absolute top-0.5 size-4 rounded-full transition-[left]"
                style={{ left: trial ? 16 : 2, background: '#ffffff', boxShadow: 'var(--shadow-sm)', transitionDuration: 'var(--duration-base)' }}
              />
            </Switch.Root>
            <span className="flex-1">
              <span className="t-compact block" style={{ color: 'var(--text-primary)' }}>
                Start with a 14-day trial
              </span>
              <span className="t-caption mt-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                No invoice is raised until the trial ends. The workspace appears under Trial on
                Overview.
              </span>
            </span>
          </label>
        </section>
      </div>

      {/* ── Rail ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:sticky lg:top-6">
        <section
          className="rounded-overlay p-5"
          style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }}
        >
          <p className="t-eyebrow mb-3.5" style={{ color: 'var(--text-tertiary)' }}>
            What happens on submit
          </p>
          <div className="grid gap-3">
            {model.steps.map((s) => (
              <div key={s.n} className="flex items-start gap-2.5">
                <span
                  className="grid size-5 shrink-0 place-items-center rounded-full"
                  style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)', font: '500 10.5px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                  aria-hidden
                >
                  {s.n}
                </span>
                <span className="t-caption flex-1" style={{ color: 'var(--text-secondary)' }}>
                  {s.text}
                </span>
              </div>
            ))}
          </div>
          <p
            className="t-caption mt-4 border-t pt-3.5"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
          >
            Runs as one transaction. If any step fails, nothing is created.
          </p>
        </section>

        <button
          type="submit"
          disabled={!ready || working || done}
          className="flex h-10 w-full items-center justify-center gap-2.5 rounded-panel"
          style={{
            border: 'none',
            background: done ? 'var(--success-fg)' : ready && !working ? 'var(--blue-500)' : 'var(--surface-inset)',
            color: done || (ready && !working) ? '#ffffff' : 'var(--text-disabled)',
            font: '500 13.5px/1 var(--font-ui)',
            cursor: ready && !working && !done ? 'pointer' : 'not-allowed',
          }}
        >
          {done ? <IconCheck size={16} stroke={1.5} aria-hidden /> : <IconPlus size={16} stroke={1.5} aria-hidden />}
          {working ? 'Provisioning' : done ? 'Workspace created' : 'Provision workspace'}
        </button>
        <p className="t-caption text-center" style={{ color: 'var(--text-tertiary)' }}>
          {done
            ? 'Invitation sent. Returning to Workspaces.'
            : working
              ? 'Running five steps in one transaction'
              : 'Typically completes in under two minutes'}
        </p>
      </div>
    </form>
  );
}
