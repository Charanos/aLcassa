'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { IconMenu2, IconX, IconCheck, IconArrowRight } from '@tabler/icons-react';
import { Wordmark } from '@/components/brand/Mark';

export interface MarketingSessionInfo {
  isAuthenticated: boolean;
  dashboardHref: string;
  dashboardLabel: string;
}

interface FloatingHeaderProps {
  session?: MarketingSessionInfo;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', href: '#overview' },
  { id: 'live-engine', label: 'Platform', href: '#live-engine' },
  { id: 'channels', label: 'Channels', href: '#channels' },
  { id: 'pricing', label: 'Pricing', href: '#pricing' },
  { id: 'faq', label: 'FAQ', href: '#faq' },
];

export function FloatingHeader({ session }: FloatingHeaderProps) {
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
        if (
          section &&
          typeof section.offsetTop === 'number' &&
          section.offsetTop <= scrollPosition
        ) {
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
        <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between gap-4 px-5 md:px-8">
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

            {/* Log in CTA Pill inside grouped navigation container with brand orange bg */}
            {session?.isAuthenticated ? (
              <Link
                href={session.dashboardHref}
                className="t-compact rounded-full px-4 py-1.5 font-medium text-white shadow-xs transition-all hover:brightness-105 active:scale-95"
                style={{
                  background: 'var(--orange-500)',
                  transitionDuration: 'var(--duration-fast)',
                }}
              >
                {session.dashboardLabel}
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="t-compact rounded-full px-4.5 py-1.5 font-medium text-white shadow-xs transition-all hover:brightness-105 active:scale-95"
                style={{
                  background: 'var(--orange-500)',
                  transitionDuration: 'var(--duration-fast)',
                }}
              >
                Log in
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <button
              ref={toggleBtnRef}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-chip border transition-colors"
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
          className="surface-glass-strong fixed top-18 right-4 left-4 z-50 rounded-overlay border border-[var(--border-subtle)] shadow-2xl sm:left-auto sm:w-80"
          /* tailwindcss-animate is not installed in this project, so the
             animate-in/fade-in/slide-in-* utilities were inert — this
             arrived with no transition at all. globals.css already defines
             the keyframes below, and its reduced-motion block covers them. */
          style={{ animation: 'panel-in var(--duration-base) var(--ease-out)' }}
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
                  className={`t-compact group flex cursor-pointer items-center justify-between rounded-chip px-4 py-2.5 whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--surface-inset)] font-medium'
                      : 'hover:bg-[var(--surface-inset)]/60'
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
                      className="ml-2 shrink-0 text-[var(--text-action)]"
                      aria-hidden="true"
                    />
                  )}
                </a>
              );
            })}

            {/* Mobile Log in Button */}
            <div className="mt-2 border-t pt-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
              {session?.isAuthenticated ? (
                <Link
                  href={session.dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className="t-compact flex items-center justify-between rounded-chip px-4 py-2.5 font-medium text-white shadow-xs transition-all"
                  style={{
                    background: 'var(--orange-500)',
                  }}
                >
                  <span>{session.dashboardLabel}</span>
                  <IconArrowRight size={14} stroke={2} />
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  onClick={() => setMenuOpen(false)}
                  className="t-compact flex items-center justify-between rounded-chip px-4 py-2.5 font-medium text-white shadow-xs transition-all"
                  style={{
                    background: 'var(--orange-500)',
                  }}
                >
                  <span>Log in</span>
                  <IconArrowRight size={14} stroke={2} />
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
