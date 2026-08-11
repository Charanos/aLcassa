'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { IconMenu2, IconX, IconCheck, IconArrowRight, IconShieldLock } from '@tabler/icons-react';
import { Wordmark } from '@/components/brand/Mark';
import { Button } from '@/components/primitives/Button';
import { ThemeToggle } from '@/components/primitives/ThemeToggle';
import type { ResolvedTheme } from '@/lib/theme';

export interface MarketingSessionInfo {
  isAuthenticated: boolean;
  dashboardHref: string;
  dashboardLabel: string;
}

interface FloatingHeaderProps {
  theme: ResolvedTheme;
  session?: MarketingSessionInfo;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', href: '#overview' },
  { id: 'live-engine', label: 'Live Platform', href: '#live-engine' },
  { id: 'channels', label: 'Channels', href: '#channels' },
  { id: 'security', label: 'Security & RLS', href: '#security' },
  { id: 'playground', label: 'Spec Playground', href: '#playground' },
];

export function FloatingHeader({ theme, session }: FloatingHeaderProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  // Click-outside and Escape key listener to close menu
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide on scroll down after 80px, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      
      lastScrollY = currentScrollY;

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
    <>
      <header
        className={`surface-glass fixed top-0 right-0 left-0 z-40 w-full transition-transform ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ transitionDuration: 'var(--duration-slow)' }}
      >
        <div
          className="mx-auto flex h-16 items-center justify-between gap-4 px-5 md:px-8"
          style={{ maxWidth: 'var(--content-max)' }}
        >
          <Link
            href="/"
            aria-label="aLcassa home"
            className="rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--border-focus)]"
          >
            <Wordmark size={22} />
          </Link>

          <nav
            aria-label="Page navigation"
            className="hidden items-center gap-1 rounded-full p-1 md:flex"
            style={{ background: 'var(--surface-inset)', boxShadow: 'var(--neu-inset)' }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.href)}
                  aria-current={isActive ? 'true' : undefined}
                  className="t-compact rounded-full px-4 py-1.5 transition-all"
                  style={{
                    background: isActive ? 'var(--surface-raised)' : 'transparent',
                    boxShadow: isActive ? 'var(--neu-raised)' : undefined,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transitionDuration: 'var(--duration-fast)',
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {session?.isAuthenticated ? (
              <Button
                asChild
                variant="primary"
                size="sm"
                className="hidden sm:inline-flex items-center gap-1.5 shadow-sm text-xs font-medium"
              >
                <Link href={session.dashboardHref}>
                  <IconShieldLock size={14} stroke={1.5} />
                  <span>{session.dashboardLabel}</span>
                  <IconArrowRight size={13} stroke={2} />
                </Link>
              </Button>
            ) : null}
            <ThemeToggle theme={theme} compact />
            <button
              ref={toggleBtnRef}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex size-9 items-center justify-center rounded-chip border transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                transitionDuration: 'var(--duration-fast)',
              }}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <IconX size={20} stroke={1.5} /> : <IconMenu2 size={20} stroke={1.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* Spacer so page content starts cleanly beneath the header */}
      <div className="h-16" />

      {/* Mobile / Pinned Dropdown Navigation Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="surface-glass-strong animate-in fade-in slide-in-from-top-2 fixed top-18 right-4 left-4 z-50 rounded-overlay sm:left-auto sm:w-80 shadow-2xl border border-[var(--border-subtle)]"
          style={{ animationDuration: 'var(--duration-base)' }}
        >
          <nav className="flex flex-col gap-1.5 p-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    scrollToSection(e, item.href);
                    setMenuOpen(false);
                  }}
                  aria-current={isActive ? 'true' : undefined}
                  className={`t-compact group flex items-center justify-between rounded-chip px-4 py-2.5 whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive ? 'bg-[var(--surface-inset)] font-medium' : 'hover:bg-[var(--surface-inset)]/60'
                  }`}
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <IconCheck
                      size={16}
                      stroke={2}
                      className="text-[var(--text-action)] shrink-0 ml-2"
                      aria-hidden="true"
                    />
                  )}
                </a>
              );
            })}

            {session?.isAuthenticated ? (
              <div
                className="mt-3 border-t pt-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <Button asChild variant="primary" size="md" className="w-full justify-center gap-2">
                  <Link href={session.dashboardHref} onClick={() => setMenuOpen(false)}>
                    <IconShieldLock size={15} stroke={1.5} />
                    <span>Open {session.dashboardLabel}</span>
                    <IconArrowRight size={14} stroke={2} />
                  </Link>
                </Button>
              </div>
            ) : (
              <div
                className="mt-3 grid grid-cols-2 gap-3 border-t pt-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <Button asChild variant="secondary" size="md" className="w-full justify-center whitespace-nowrap">
                  <Link href="/sign-in" onClick={() => setMenuOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild variant="accent" size="md" className="w-full justify-center whitespace-nowrap">
                  <Link href="/sign-up" onClick={() => setMenuOpen(false)}>
                    Request access
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
