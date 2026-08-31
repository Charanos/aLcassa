'use client';

import { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Button } from '@/components/primitives/Button';

const ACCENTS = [
  { id: 'alcassa', name: 'aLcassa Blue', hex: '#043ae1' },
  { id: 'ember', name: 'Ember Orange', hex: '#fa5505' },
  { id: 'navy', name: 'Deep Navy', hex: '#17225d' },
  { id: 'moss', name: 'Moss Green', hex: '#4a7c59' },
  { id: 'clay', name: 'Clay Terracotta', hex: '#b4643f' },
  { id: 'verdigris', name: 'Verdigris', hex: '#3e8a82' },
  { id: 'brass', name: 'Brass Gold', hex: '#a8813c' },
  { id: 'rust', name: 'Rust', hex: '#9c4a32' },
  { id: 'slate', name: 'Slate Blue', hex: '#4e6478' },
  { id: 'graphite', name: 'Graphite Black', hex: '#3d424b' },
];

export function AppearanceSettings() {
  const [activeAccent, setActiveAccent] = useState('alcassa');
  const [sidebarHover, setSidebarHover] = useState(true); // Default to hover expand
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      '.gsap-stagger',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
    );
  }, { scope: containerRef });

  const handleAccentChange = (id: string) => {
    setActiveAccent(id);
    document.documentElement.dataset.accent = id;
    
    // Animate the change for a premium feel
    gsap.fromTo('html', { opacity: 0.8 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
  };

  const toggleSidebarBehavior = (value: boolean) => {
    setSidebarHover(value);
    // Persist this config (in a real app, this goes to DB/localStorage)
    localStorage.setItem('aLcassa:sidebar-expand-on-hover', String(value));
  };

  return (
    <div ref={containerRef} className="grid gap-12">
      <section className="gsap-stagger rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 md:p-8">
        <h2 className="t-panel text-[var(--text-primary)]">Accent Palette</h2>
        <p className="t-compact mt-2 text-[var(--text-secondary)] max-w-xl">
          Select the primary accent color for your workspace. This color will be applied to your organization&apos;s avatar, navigation highlights, and key charts.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {ACCENTS.map((accent) => {
            const isActive = activeAccent === accent.id;
            return (
              <button
                key={accent.id}
                onClick={() => handleAccentChange(accent.id)}
                className={`group relative flex flex-col items-center gap-3 rounded-lg border p-4 transition-all duration-200 hover:bg-[var(--surface-inset)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                  isActive ? 'border-[var(--border-focus)] bg-[var(--surface-inset)] shadow-sm' : 'border-[var(--ink-100)]'
                }`}
              >
                <div 
                  className={`size-10 rounded-full shadow-inner transition-transform duration-300 group-hover:scale-110 ${isActive ? 'ring-4 ring-[var(--surface-base)] ring-offset-2 ring-offset-[var(--accent-500)]' : ''}`}
                  style={{ backgroundColor: accent.hex }}
                />
                <span className="t-compact text-center font-medium">{accent.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="gsap-stagger rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 md:p-8">
        <h2 className="t-panel text-[var(--text-primary)]">Layout Behavior</h2>
        <p className="t-compact mt-2 text-[var(--text-secondary)] max-w-xl">
          Customize how the workspace interface behaves to suit your workflow.
        </p>

        <div className="mt-8 border-t border-[var(--ink-100)] pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="t-body font-medium text-[var(--text-primary)]">Sidebar Expand on Hover</h3>
              <p className="t-compact mt-1 text-[var(--text-secondary)]">
                Automatically expand the collapsed sidebar when you hover over it.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-chip border border-[var(--ink-100)] bg-[var(--surface-inset)] p-1">
              <button
                onClick={() => toggleSidebarBehavior(true)}
                className={`rounded-sm px-4 py-1.5 text-sm font-medium transition-colors ${
                  sidebarHover 
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Enabled
              </button>
              <button
                onClick={() => toggleSidebarBehavior(false)}
                className={`rounded-sm px-4 py-1.5 text-sm font-medium transition-colors ${
                  !sidebarHover 
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Disabled
              </button>
            </div>
          </div>
        </div>
      </section>
      
      <div className="gsap-stagger flex justify-end">
        <Button variant="primary">Save Preferences</Button>
      </div>
    </div>
  );
}
