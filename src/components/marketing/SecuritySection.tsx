'use client';

import { useState, useEffect } from 'react';
import {
  IconShieldCheck,
  IconClock,
  IconKeyOff,
  IconFileCode,
  IconCheck,
} from '@tabler/icons-react';

export function SecuritySection() {
  const [secondsRemaining, setSecondsRemaining] = useState(1458);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 1800));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <section className="mt-20 md:mt-32">
      {/* Inverted high-contrast section enclosure: dark navy against the page, always. */}
      <div
        className="relative overflow-hidden rounded-panel border p-8 transition-all md:p-12"
        style={{
          background: 'var(--invert-card-bg)',
          borderColor: 'var(--invert-card-border)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
        }}
      >
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="size-2 animate-pulse rounded-full bg-warning-bg" />
              <p className="t-eyebrow font-medium tracking-wider text-warning">
                THE ISOLATION &amp; SECURITY GUARANTEE
              </p>
            </div>

            <h2 className="display display-md mt-4" style={{ color: 'var(--invert-card-fg)' }}>
              You can see every time we look at your workspace.
            </h2>

            <p
              className="t-body mt-5 leading-relaxed"
              style={{ color: 'var(--invert-card-subtle)', maxWidth: 'var(--measure-prose)' }}
            >
              When our support team opens your account, they do it through a scoped session bound by
              exactly the same Row Level Security rules that protect you from every other business
              on the platform. Not a master key. The session is read-only, it expires after thirty
              minutes, it is written to your own activity log with a reason, and you can end it
              yourself at any time.
            </p>

            {/* Clean inline metric items without card boxes */}
            <div
              className="mt-8 grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-3"
              style={{ borderColor: 'var(--invert-card-rule)' }}
            >
              <div className="flex items-center gap-2.5">
                <IconKeyOff size={18} className="shrink-0 text-warning" />
                <span className="t-compact font-medium" style={{ color: 'var(--invert-card-fg)' }}>
                  Zero Master Keys
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <IconClock size={18} className="shrink-0 text-danger" />
                <span className="t-compact font-medium" style={{ color: 'var(--invert-card-fg)' }}>
                  30-Min Strict Expiry
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <IconFileCode size={18} className="shrink-0 text-success" />
                <span className="t-compact font-medium" style={{ color: 'var(--invert-card-fg)' }}>
                  Immutable Audit Log
                </span>
              </div>
            </div>
          </div>

          {/* Right Support Session Telemetry Card Demo */}
          <div
            className="rounded-panel border p-6 shadow-md transition-all"
            style={{
              background: 'var(--invert-card-well)',
              borderColor: 'var(--invert-card-well-border)',
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-4"
              style={{ borderColor: 'var(--invert-card-rule)' }}
            >
              <div className="flex items-center gap-2.5">
                <IconShieldCheck size={18} className="text-success" />
                <span className="t-panel font-medium" style={{ color: 'var(--invert-card-fg)' }}>
                  Support Mode Active
                </span>
              </div>
              <span className="t-eyebrow rounded-chip border border-success/30 bg-success/15 px-2.5 py-0.5 text-success">
                SCOPED RLS
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="t-compact flex items-center justify-between">
                <span style={{ color: 'var(--invert-card-subtle)' }}>Target Workspace:</span>
                <span className="font-mono text-sm" style={{ color: 'var(--invert-card-fg)' }}>
                  Acme Logistics (#829)
                </span>
              </div>

              <div className="t-compact flex items-center justify-between">
                <span style={{ color: 'var(--invert-card-subtle)' }}>Session Reason:</span>
                <span className="font-medium" style={{ color: 'var(--invert-card-fg)' }}>
                  Ticket #4829 verification
                </span>
              </div>

              <div
                className="flex items-center justify-between rounded-chip border p-3"
                style={{
                  background: 'var(--invert-card-bg)',
                  borderColor: 'var(--invert-card-well-border)',
                }}
              >
                <span className="t-compact" style={{ color: 'var(--invert-card-subtle)' }}>
                  Time Remaining:
                </span>
                <span className="numeric font-mono text-base font-normal tracking-wider text-danger">
                  {formatTime(secondsRemaining)}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <div className="t-caption flex items-center gap-2 text-success">
                  <IconCheck size={14} className="shrink-0" />
                  <span>Row Level Security (RLS) active on all queries</span>
                </div>
                <div className="t-caption flex items-center gap-2 text-success">
                  <IconCheck size={14} className="shrink-0" />
                  <span>Audit entry written to tenant activity log</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
