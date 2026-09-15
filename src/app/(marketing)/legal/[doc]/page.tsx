import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { IconArrowLeft, IconFileText } from '@tabler/icons-react';
import { Wordmark } from '@/components/brand/Mark';

/**
 * IA §3 lists `/legal/*` among the public routes. It has never existed, and
 * three places link into it: the marketing footer, the auth shell's footer on
 * every access page, and — the one that matters — the consent line under the
 * sign-up button, which asks the reader to agree to documents that returned
 * 404.
 *
 * ⚠ THESE PAGES DO NOT CONTAIN TERMS, AND THAT IS DELIBERATE. A Terms of
 * Service and a Privacy Notice are binding instruments for a real Kenyan
 * company handling real customer messages under the Data Protection Act 2019.
 * Inventing plausible-sounding clauses would be worse than the 404 it
 * replaces: a 404 is visibly broken, whereas fabricated terms look
 * authoritative, would be relied on by readers, and would have to be
 * un-published once counsel saw them.
 *
 * So each page states plainly that the document is not yet published, names
 * what it will cover so the scaffold is useful to whoever drafts it, and
 * gives a real route to a human. The consent line on `/sign-up` should not
 * claim agreement to an unpublished document — that is flagged for the
 * client, and is a copy decision rather than one to make here.
 */

type LegalDoc = {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; blurb: string }[];
};

const DOCS: Record<string, LegalDoc> = {
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    summary:
      'The agreement between aLcassa and the organisation using it — what each side commits to, and what happens when either stops.',
    sections: [
      {
        heading: 'The service, and who may use it',
        blurb:
          'What a workspace is, who may open one, and the account holder’s responsibility for the people they invite into it.',
      },
      {
        heading: 'Plans, billing and trials',
        blurb:
          'How subscription tiers, entitlements and the trial period work, including what happens at a limit. aLcassa refuses over an entitlement rather than billing overage.',
      },
      {
        heading: 'Acceptable use',
        blurb:
          'The messaging conduct required of a workspace, including consent for outbound sends and compliance with each channel provider’s own rules.',
      },
      {
        heading: 'Customer data and ownership',
        blurb:
          'The conversations and contacts in a workspace belong to that workspace. What aLcassa may do with them, and what it may not.',
      },
      {
        heading: 'Support access',
        blurb:
          'When platform staff may enter a workspace, the record kept when they do, and what they are permanently prevented from doing while inside.',
      },
      {
        heading: 'Suspension, termination and export',
        blurb:
          'Grounds for suspension, notice, and how a workspace retrieves its data on the way out.',
      },
      {
        heading: 'Liability and governing law',
        blurb: 'Limitations, warranties, and the jurisdiction these terms are read under.',
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Notice',
    summary:
      'What personal data aLcassa holds, why, for how long, and the rights of the people it belongs to.',
    sections: [
      {
        heading: 'Who the data controller is',
        blurb:
          'The distinction that governs everything below: a workspace controls its customers’ data, and aLcassa processes it on that workspace’s instructions.',
      },
      {
        heading: 'What is collected',
        blurb:
          'Account details, the messages that pass through connected channels, and the operational logs kept to run the service.',
      },
      {
        heading: 'Why, and on what lawful basis',
        blurb:
          'The purpose behind each category, and the basis relied on under the Data Protection Act 2019.',
      },
      {
        heading: 'Automated processing',
        blurb:
          'Where an AI assistant reads or drafts messages, what it is permitted to do, and how a person stays in the loop.',
      },
      {
        heading: 'Sharing and sub-processors',
        blurb:
          'The channel providers, infrastructure and model vendors involved in delivering the service, and where they are located.',
      },
      {
        heading: 'Retention and deletion',
        blurb: 'How long each category is kept, and what deletion actually removes.',
      },
      {
        heading: 'Your rights, and how to exercise them',
        blurb:
          'Access, correction, deletion and objection — including the route for someone whose data sits inside a customer’s workspace rather than ours.',
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  const found = DOCS[doc];
  if (!found) return { title: 'Not found' };

  return {
    title: found.title,
    description: found.summary,
    /* Not indexed while unpublished. A search result promising terms that
       turn out to be an outline is a worse first impression than no result. */
    robots: { index: false, follow: true },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const found = DOCS[doc];
  if (!found) notFound();

  return (
    <div className="min-h-dvh bg-[var(--surface-base)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <Link href="/" aria-label="aLcassa home" className="inline-flex items-center">
            <Wordmark size={20} />
          </Link>
          <span className="text-[var(--ink-300)]" aria-hidden>
            |
          </span>
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <IconArrowLeft
              size={13}
              aria-hidden
              className="transition-transform group-hover:-translate-x-0.5"
            />
            Back to home
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-6 py-12">
        <p className="t-eyebrow uppercase" style={{ color: 'var(--text-tertiary)' }}>
          Legal
        </p>
        <h1 className="t-display mt-2">{found.title}</h1>
        <p className="t-lede mt-3 max-w-[62ch] text-pretty text-[var(--text-secondary)]">
          {found.summary}
        </p>

        {/*
          OCHRE, not oxide. The reader can act on this — there is a contact
          route — and nothing is broken. 03 §14.
        */}
        <div
          role="status"
          className="mt-8 flex gap-3 rounded-panel border px-4 py-3.5"
          style={{
            background: 'var(--warning-bg)',
            borderColor: 'var(--warning-fg)',
            color: 'var(--warning-fg)',
          }}
        >
          <IconFileText size={18} stroke={1.6} aria-hidden className="mt-0.5 shrink-0" />
          <div className="t-compact text-pretty">
            <p className="font-medium">This document is not yet published.</p>
            <p className="mt-1">
              The outline below is what it will cover. Until it is in force, the agreement governing
              your workspace is the one in your order form or contract. For a copy, or for anything
              urgent, email{' '}
              <a
                href="mailto:legal@alcassa.co.ke"
                className="font-medium underline underline-offset-2"
              >
                legal@alcassa.co.ke
              </a>
              .
            </p>
          </div>
        </div>

        <ol className="mt-10 grid gap-6">
          {found.sections.map((section, index) => (
            <li key={section.heading} className="flex gap-4">
              <span
                className="t-data w-6 shrink-0 pt-0.5"
                style={{ color: 'var(--text-tertiary)' }}
                aria-hidden
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="t-panel">{section.heading}</h2>
                <p className="t-compact mt-1 max-w-[62ch] text-pretty text-[var(--text-secondary)]">
                  {section.blurb}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="t-caption mt-12 border-t border-[var(--border-subtle)] pt-6 text-[var(--text-tertiary)]">
          {found.slug === 'terms' ? (
            <>
              Looking for how we handle personal data?{' '}
              <Link href="/legal/privacy" className="underline underline-offset-4">
                Privacy Notice
              </Link>
              .
            </>
          ) : (
            <>
              Looking for the service agreement?{' '}
              <Link href="/legal/terms" className="underline underline-offset-4">
                Terms of Service
              </Link>
              .
            </>
          )}
        </p>
      </main>
    </div>
  );
}
