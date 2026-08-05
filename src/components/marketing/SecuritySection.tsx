'use client';

import { useState, useEffect } from 'react';
import { IconShieldCheck, IconClock, IconKeyOff, IconFileCode, IconCheck } from '@tabler/icons-react';

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
      <div
        className="relative overflow-hidden rounded-panel border p-8 md:p-12"
        style={{
          background: 'var(--surface-invert)',
          borderColor: 'var(--copper-rule)',
          color: 'var(--ink-inverse)',
        }}
      >
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-2 rounded-full bg-[var(--verdigris-solid)]" />
              <p className="t-eyebrow text-[var(--copper-rule)]">
                The Isolation & Security Guarantee
              </p>
            </div>

            <h2
              className="t-display mt-4 text-[var(--ink-inverse)]"
              style={{ maxWidth: '24ch' }}
            >
              You can see every time we look at your workspace.
            </h2>

            <p
              className="t-body mt-5 text-[var(--ink-inverse)] opacity-90"
              style={{ maxWidth: 'var(--measure-prose)' }}
            >
              When our support team opens your account, they do it through a scoped session bound by
              exactly the same Row Level Security rules that protect you from every other business on
              the platform. Not a master key. The session is read-only, it expires after thirty
              minutes, it is written to your own activity log with a reason, and you can end it
              yourself at any time.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[var(--rule-strong)]/30 pt-6">
              <div className="flex items-center gap-2.5">
                <IconKeyOff size={18} className="text-[var(--copper-rule)] shrink-0" />
                <span className="t-compact text-[var(--ink-inverse)]">
                  Zero Master Keys
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <IconClock size={18} className="text-[var(--verdigris-rule)] shrink-0" />
                <span className="t-compact text-[var(--ink-inverse)]">
                  30-Min Strict Expiry
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <IconFileCode size={18} className="text-[var(--slate-rule)] shrink-0" />
                <span className="t-compact text-[var(--ink-inverse)]">
                  Immutable Audit Log
                </span>
              </div>
            </div>
          </div>

          {/* Right Support Session Telemetry Card Demo */}
          <div
            className="rounded-panel border p-6"
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              borderColor: 'var(--rule-strong)',
            }}
          >
            <div className="flex items-center justify-between border-b border-[var(--rule-strong)]/40 pb-4">
              <div className="flex items-center gap-2">
                <IconShieldCheck size={18} className="text-[var(--verdigris-solid)]" />
                <span className="t-panel text-[var(--ink-inverse)]">
                  Support Mode Active
                </span>
              </div>
              <span className="t-eyebrow text-[var(--verdigris-ink)] bg-[var(--verdigris-tint)] px-2 py-0.5 rounded-chip">
                SCOPED RLS
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center t-compact">
                <span className="text-[var(--ink-inverse)] opacity-70">Target Workspace:</span>
                <span className="text-[var(--ink-inverse)]">Acme Logistics (#829)</span>
              </div>

              <div className="flex justify-between items-center t-compact">
                <span className="text-[var(--ink-inverse)] opacity-70">Session Reason:</span>
                <span className="text-[var(--ink-inverse)]">Ticket #4829 verification</span>
              </div>

              <div className="flex justify-between items-center t-data rounded-chip border p-3 bg-black/30 border-[var(--rule-strong)]/30">
                <span className="opacity-70">Time Remaining:</span>
                <span className="text-[var(--copper-rule)] tracking-wider">
                  {formatTime(secondsRemaining)}
                </span>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2 t-caption text-[var(--verdigris-rule)]">
                  <IconCheck size={14} />
                  <span>Row Level Security (RLS) active on all queries</span>
                </div>
                <div className="flex items-center gap-2 t-caption text-[var(--verdigris-rule)]">
                  <IconCheck size={14} />
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
