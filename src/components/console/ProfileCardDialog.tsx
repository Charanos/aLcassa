'use client';

import React, { useEffect, useRef } from 'react';
import { IconX, IconShieldCheck, IconKey, IconUserCheck, IconClock } from '@tabler/icons-react';
import { gsapSafe } from '@/lib/motion';

export function ProfileCardDialog({
  owner,
  isOpen,
  onClose,
}: {
  owner: { initials: string; name: string; email: string };
  isOpen: boolean;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (overlayRef.current) {
        gsapSafe.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: 'power2.out' },
        );
      }
      if (cardRef.current) {
        gsapSafe.fromTo(
          cardRef.current,
          { opacity: 0, y: 15, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.4,
            ease: 'power3.out',
            clearProps: 'transform',
          },
        );
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="console-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-slab"
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-subtle)',
          boxShadow:
            '0 24px 60px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-full transition-colors hover:bg-black/5"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Close"
        >
          <IconX size={18} stroke={2} />
        </button>

        {/* Header Track */}
        <div
          className="h-24 w-full"
          style={{
            background: 'linear-gradient(135deg, var(--surface-inset), var(--surface-sunken))',
            borderBottom: '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
          }}
        />

        {/* Content */}
        <div className="relative px-6 pb-6 text-center">
          {/* Avatar (Breaking the plane) */}
          <div className="flex justify-center">
            <div
              className="relative -mt-12 flex size-24 shrink-0 items-center justify-center rounded-full text-2xl font-medium"
              style={{
                background: 'var(--surface-raised)',
                boxShadow:
                  '0 4px 12px rgba(0,0,0,0.05), inset 0 0 0 1px var(--border-subtle), inset 0 2px 4px rgba(255,255,255,0.8)',
                color: 'var(--text-primary)',
              }}
              aria-hidden="true"
            >
              {owner.initials}
              <span
                className="absolute top-2 right-1 size-4 rounded-full border-[3px]"
                style={{ background: 'var(--success-fg)', borderColor: 'var(--surface-raised)' }}
              />
            </div>
          </div>

          <div className="mt-4">
            <h2
              className="text-xl font-medium tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {owner.name}
            </h2>
            <p className="mt-1 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
              {owner.email}
            </p>
            <span
              className="mt-3 inline-block rounded-full px-3 py-1 text-2xs font-medium tracking-[0.1em] uppercase"
              style={{
                background: 'var(--surface-inset)',
                color: 'var(--text-tertiary)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              Primary Administrator
            </span>
          </div>

          {/* Debossed Security Well */}
          <div
            className="mt-6 flex flex-col rounded-card"
            style={{
              background: 'var(--surface-sunken)',
              boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.02), inset 0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom: '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <div className="flex items-center gap-2">
                <IconShieldCheck size={14} stroke={2} style={{ color: 'var(--success-fg)' }} />
                <span
                  className="text-xs font-medium tracking-wide uppercase"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Account Status
                </span>
              </div>
              <span
                className="font-mono text-xs font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Active
              </span>
            </div>

            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom: '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <div className="flex items-center gap-2">
                <IconKey size={14} stroke={2} style={{ color: 'var(--text-secondary)' }} />
                <span
                  className="text-xs font-medium tracking-wide uppercase"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Security
                </span>
              </div>
              <span
                className="font-mono text-xs font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                MFA Enabled
              </span>
            </div>

            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom: '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <div className="flex items-center gap-2">
                <IconUserCheck size={14} stroke={2} style={{ color: 'var(--text-secondary)' }} />
                <span
                  className="text-xs font-medium tracking-wide uppercase"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Access Level
                </span>
              </div>
              <span
                className="font-mono text-xs font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Full Admin
              </span>
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <IconClock size={14} stroke={2} style={{ color: 'var(--text-secondary)' }} />
                <span
                  className="text-xs font-medium tracking-wide uppercase"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Joined
                </span>
              </div>
              <span
                className="font-mono text-xs font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                08 Aug 2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
