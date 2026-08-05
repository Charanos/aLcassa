'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';
import { Button } from '@/components/primitives/Button';
import { ThemeToggle } from '@/components/primitives/ThemeToggle';
import type { ResolvedTheme } from '@/lib/theme';

interface FloatingHeaderProps {
  theme: ResolvedTheme;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', href: '#overview' },
  { id: 'live-engine', label: 'Live Platform', href: '#live-engine' },
  { id: 'channels', label: 'Channels', href: '#channels' },
  { id: 'security', label: 'Security & RLS', href: '#security' },
  { id: 'playground', label: 'Spec Playground', href: '#playground' },
];

export function FloatingHeader({ theme }: FloatingHeaderProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);

      const sections = NAV_ITEMS.map((item) => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 120;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && typeof section.offsetTop === 'number' && section.offsetTop <= scrollPosition) {
          const navItem = NAV_ITEMS[i];
          if (navItem) {
            setActiveTab(navItem.id);
          }
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.substring(1);
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
        setActiveTab(targetId);
      }
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors duration-200 ${
        scrolled ? 'backdrop-blur-md' : ''
      }`}
      style={{
        background: scrolled ? 'var(--surface-raised)' : 'var(--surface-page)',
        borderColor: 'var(--rule-soft)',
      }}
    >
      <div
        className="mx-auto flex h-16 items-center justify-between gap-4 px-5 md:px-8"
        style={{ maxWidth: '1280px' }}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]"
        >
          <Mark size={20} />
          <div className="flex flex-col">
            <span className="t-chip text-[var(--ink-primary)]">Conduit</span>
          </div>
        </Link>

        {/* Center Pill Navigation Bar */}
        <nav
          aria-label="Page navigation"
          className="hidden md:flex items-center gap-1 rounded-full border p-1"
          style={{
            background: 'var(--surface-sunken)',
            borderColor: 'var(--rule-soft)',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => scrollToSection(e, item.href)}
                className={`t-compact px-3.5 py-1 rounded-full transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--copper-solid)] text-[var(--ink-inverse)]'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} compact />
          <Button asChild variant="quiet" size="md">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="primary" size="md">
            <Link href="/sign-up">Request access →</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
