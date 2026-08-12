'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { IconBuilding, IconWorld, IconServer2 } from '@tabler/icons-react';
import gsap from 'gsap';

export function ProvisionWorkspaceDialog({
  onCancel,
  onProvision,
}: {
  onCancel: () => void;
  onProvision: (data: { name: string; region: string; plan: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('us-east');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
    if (overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' });
    }
    if (dialogRef.current) {
      gsap.fromTo(
        dialogRef.current,
        { opacity: 0, y: 18, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out', clearProps: 'transform' }
      );
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, pending]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onProvision({ name, region, plan: 'pro' });
      if (result.ok === false) setError(result.error);
    });
  }

  const generatedSlug = name.trim() ? name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') + '.conduit.app' : 'your-workspace.conduit.app';

  return (
    <div
      ref={overlayRef}
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'var(--surface-overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-6)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="provision-workspace-title"
        onClick={(e) => e.stopPropagation()}
        className="surface-glass-strong w-[520px] max-w-full overflow-hidden rounded-overlay"
        style={{
          boxShadow: 'var(--glass-highlight), var(--shadow-lg)',
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid var(--border-subtle)' }}>
               <IconBuilding size={20} style={{ color: 'var(--text-primary)' }} stroke={1.5} />
            </div>
            <div>
              <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)', letterSpacing: 'var(--t-eyebrow-tracking)' }}>
                NEW TENANT
              </p>
              <h2
                id="provision-workspace-title"
                className="display display-sm"
                style={{ color: 'var(--text-primary)', lineHeight: 1.1 }}
              >
                Provision Workspace
              </h2>
            </div>
          </div>
          
          <p
            className="t-body mb-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            Create an isolated environment with dedicated row-level security and independent billing.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* Name Input */}
            <label className="block">
              <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)', letterSpacing: 'var(--t-label-tracking)' }}>
                Workspace Name
              </span>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-md px-3 py-2.5 t-body"
                style={{
                  background: 'rgba(0,0,0,0.02)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  /* ink-600 on focus: visible, on-brand, not loud */
                  e.target.style.borderColor = 'var(--ink-600)';
                  e.target.style.boxShadow = '0 0 0 1px var(--ink-600)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-subtle)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div className="mt-2 t-caption" style={{ color: 'var(--text-tertiary)' }}>
                Will be accessible at <span className="numeric font-medium" style={{ color: 'var(--text-secondary)' }}>{generatedSlug}</span>
              </div>
            </label>

            {/* Region Selection */}
            <div>
              <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)', letterSpacing: 'var(--t-label-tracking)' }}>
                Data Residency
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setRegion('us-east')}
                  className="flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${region === 'us-east' ? 'var(--ink-700)' : 'var(--border-subtle)'}`,
                    background: region === 'us-east' ? 'rgba(23,42,153,0.05)' : 'transparent',
                  }}
                >
                  {/* orange accent mark on selected — one-per-screen budget */}
                  <IconWorld size={18} style={{ color: region === 'us-east' ? 'var(--accent-mark-text)' : 'var(--text-tertiary)' }} stroke={1.5} />
                  <div>
                    <div className="t-label" style={{ color: 'var(--text-primary)' }}>US East (N. Virginia)</div>
                    <div className="t-caption" style={{ color: 'var(--text-tertiary)' }}>Default region</div>
                  </div>
                </div>
                <div 
                  onClick={() => setRegion('eu-west')}
                  className="flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${region === 'eu-west' ? 'var(--ink-700)' : 'var(--border-subtle)'}`,
                    background: region === 'eu-west' ? 'rgba(23,42,153,0.05)' : 'transparent',
                  }}
                >
                  <IconServer2 size={18} style={{ color: region === 'eu-west' ? 'var(--accent-mark-text)' : 'var(--text-tertiary)' }} stroke={1.5} />
                  <div>
                    <div className="t-label" style={{ color: 'var(--text-primary)' }}>EU West (Frankfurt)</div>
                    <div className="t-caption" style={{ color: 'var(--text-tertiary)' }}>GDPR Compliant</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="t-compact mt-1 font-medium" style={{ color: 'var(--danger-fg)' }}>
                {error}
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-4 flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="t-compact px-4 py-2 rounded-md font-medium transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="t-compact px-4 py-2 rounded-md font-medium transition-all"
                style={{
                  /* Blue is primary. The CTA keeps the brand blue — this is correct use. */
                  background: pending ? 'var(--surface-sunken)' : 'var(--blue-500)',
                  color: pending ? 'var(--text-tertiary)' : '#ffffff',
                  boxShadow: pending ? 'none' : '0 2px 8px rgba(4, 58, 225, 0.25)',
                  cursor: pending ? 'wait' : 'pointer'
                }}
              >
                {pending ? 'Provisioning...' : 'Provision workspace'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
