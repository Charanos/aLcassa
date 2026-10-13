import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { createResolvedContext } from '@/lib/db/context';

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  company: vi.fn(),
  subscription: vi.fn(),
  team: vi.fn(),
  audit: vi.fn(),
}));
vi.mock('@/lib/console/session', () => ({
  resolveSupportSessionId: () => Promise.resolve('owned-visit'),
}));
vi.mock('@/lib/auth/resolve', () => ({ resolveSupportContext: mocks.resolve }));
vi.mock('@/lib/tenant/live', () => ({
  getLiveCompany: mocks.company,
  getLiveSubscription: mocks.subscription,
  getLiveTeam: mocks.team,
  getLiveTenantAudit: mocks.audit,
}));
vi.mock('@/components/console/inside/InvitationActions', () => ({ InvitationActions: () => null }));
vi.mock('@/components/structure/NavigationLink', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement('a', { href }, children),
}));
vi.mock('@/components/console/Surface', () => ({
  ConsolePage: ({ children }: { children: ReactNode }) => createElement('main', null, children),
  ConsoleHeader: ({ title }: { title: string }) => createElement('h1', null, title),
  DataSource: () => null,
  Panel: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  SectionHeading: () => null,
}));
import InsidePage from '@/app/(platform)/platform/(console)/inside/page';

const context = {
  ...createResolvedContext({
    tenantId: 'owned-workspace',
    role: 'support',
    actorId: 'owned-operator',
    actorLabel: 'Support verifier',
    actorType: 'platform_admin',
    supportMode: true,
    requestId: 'owned-request',
    sessionId: 'owned-visit',
  }),
  tenantName: 'Private customer',
  tenantSlug: 'private-customer',
};
beforeEach(() => {
  vi.resetAllMocks();
  for (const reader of [mocks.company, mocks.subscription, mocks.team, mocks.audit])
    reader.mockResolvedValue(null);
});
it('does not call customer readers without a live visit', async () => {
  mocks.resolve.mockResolvedValue(null);
  expect(renderToStaticMarkup(await InsidePage())).toContain('Not inside a workspace');
  expect(mocks.company).not.toHaveBeenCalled();
});
it('renders an ended visit when expiry is refused at the data boundary', async () => {
  mocks.resolve.mockResolvedValue(context);
  mocks.company.mockRejectedValue(new AppError(ERROR_CODES.SUPPORT_SESSION_EXPIRED));
  const html = renderToStaticMarkup(await InsidePage());
  expect(html).toContain('Not inside a workspace');
  expect(html).not.toContain('Private customer');
});
it('withholds customer output if authority disappears while readers finish', async () => {
  mocks.resolve.mockResolvedValueOnce(context).mockResolvedValueOnce(null);
  const html = renderToStaticMarkup(await InsidePage());
  expect(html).toContain('Not inside a workspace');
  expect(html).not.toContain('Private customer');
  expect(mocks.resolve).toHaveBeenCalledTimes(2);
});
