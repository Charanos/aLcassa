/**
 * Shared console types.
 *
 * Kept in a plain module with no `'use client'` directive so both the server
 * layout and the client shell can import them without dragging either across
 * the boundary. (Splitting AuthShell taught this the hard way: a directive at
 * the top of a shared module is contagious downward through everything that
 * imports it.)
 */

export type ConsoleWorkspace = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  initials: string;
};

export type ConsoleNavItem = {
  href: string;
  label: string;
  /** Tabler icon name resolved by the shell's ICONS map. */
  icon: string;
  badge?: number;
};

export type ConsoleNavGroup = {
  label: string;
  items: ConsoleNavItem[];
};

export type NoticeKind = 'danger' | 'warning' | 'plain';

export type ConsoleNotice = {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  time: string;
  href: string;
};

export type ConsoleAccount = {
  name: string;
  email: string;
  role: string;
  initials: string;
};
