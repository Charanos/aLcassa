import 'server-only';
import { getAuditEntries, getWorkspaces, type AuditEntry, type WorkspaceRow } from './data';
import { getLiveAuditEntries, getLiveWorkspaces } from './liveWorkspaces';
import { getLiveRevenueFigures } from './liveRevenue';
import { PORTFOLIO_REVENUE } from './portfolio';
import type { Standing } from './revenue';
import { formatAllowanceLimit } from './allowances';

const STANDING_LABEL: Record<Standing, string> = {
  billing: 'billing',
  past_due: 'past due',
  trial: 'on trial',
  trial_ended: 'trial ended, undecided',
  stopped: 'not billed',
  none: 'no subscription',
};

const nairobiDate = (at: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(at);

/**
 * CSV export for the console. 17 §6.1.
 *
 * ⚠ FOUR EXPORT BUTTONS ACROSS FOUR SCREENS, ONE HANDLER.
 *
 * Workspaces, Revenue, the audit log and the settings panel each carried their
 * own download control, and all four did nothing. They are the same operation
 * with a different WHERE clause, so they are one route with a closed resource
 * catalogue rather than four handlers that will drift.
 *
 * ⚠ THE CATALOGUE IS CLOSED, AND THAT IS THE SECURITY PROPERTY. The resource
 * arrives in the URL. An open mapping — resource name to table — is an
 * arbitrary-read primitive wearing a download button. Anything not in
 * `EXPORTS` is a 404 before a query is considered.
 *
 * ⚠ CUSTOMER MESSAGE BODIES ARE NOT EXPORTABLE, and never become so by adding
 * a key here. The settings panel states this to the reader; the catalogue is
 * what makes it true.
 */

export type ExportResource = 'workspaces' | 'revenue' | 'audit';

export const EXPORT_LABELS: Record<ExportResource, string> = {
  workspaces: 'Workspace roster · CSV',
  revenue: 'Revenue · CSV',
  audit: 'Audit log · CSV',
};

export function isExportResource(value: string): value is ExportResource {
  return value === 'workspaces' || value === 'revenue' || value === 'audit';
}

/** What may enter a cell. Anything else is a bug at the call site, not here. */
type CellValue = string | number | boolean | null | undefined;

/**
 * One cell, escaped for RFC 4180 — and for Excel.
 *
 * ⚠ THE LEADING APOSTROPHE IS NOT COSMETIC. A cell beginning `=`, `+`, `-` or
 * `@` is a FORMULA to Excel, Sheets and LibreOffice, and a workspace name is
 * attacker-controlled text that lands in this file. `=HYPERLINK(...)` in a
 * roster an operator opens on their own machine is the whole attack, and it
 * needs no bug on our side to work.
 *
 * Prefixing with an apostrophe makes the spreadsheet treat it as text. The
 * apostrophe is not part of the value and does not display in a spreadsheet;
 * it is visible only to something reading the raw bytes, which is the correct
 * trade.
 */
function cell(value: CellValue): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

function toCsv(headers: string[], rows: CellValue[][]): string {
  const lines = [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))];
  /*
    CRLF per RFC 4180, and a UTF-8 byte order mark. Without the mark Excel on
    Windows reads the file as the system code page and a workspace called
    "Kariũki" arrives mangled — which looks like our bug to whoever opens it.
  */
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export type ExportFile = { filename: string; body: string; rows: number };

/**
 * Build one export.
 *
 * ⚠ IT READS THROUGH THE SAME SEAM THE SCREEN DOES. Live first, designed
 * fixture second — so an export taken from the review deployment contains the
 * designed data the reviewer is looking at, rather than failing or, worse,
 * returning an empty file that reads as "no workspaces".
 *
 * ⚠ IT BUILDS THE WHOLE STRING IN MEMORY, and that is correct at this size and
 * stated so it is not discovered later. The roster is bounded by how many
 * customers the business has; the audit log is capped at its own read limit.
 * Past roughly fifty thousand rows this becomes a streaming response with a
 * cursor, which is a different function rather than a tweak to this one.
 */
export async function buildExport(resource: ExportResource, stamp: Date): Promise<ExportFile> {
  const date = stamp.toISOString().slice(0, 10);

  switch (resource) {
    case 'workspaces': {
      const rows = (await getLiveWorkspaces()) ?? (await getWorkspaces());
      return {
        filename: `alcassa-workspaces-${date}.csv`,
        rows: rows.length,
        body: toCsv(
          [
            'Workspace',
            'Slug',
            'Status',
            'Plan',
            'Seats used',
            'Seat limit',
            'Events',
            'Event limit',
            'Last activity',
            'Created',
          ],
          rows.map((w: WorkspaceRow) => [
            w.name,
            w.slug,
            w.status,
            w.plan,
            w.seatsUsed,
            formatAllowanceLimit(w.seatsLimit),
            w.events,
            w.eventsLimit,
            w.activity,
            w.created,
          ]),
        ),
      };
    }

    case 'revenue': {
      /*
        ⚠ THE FIRST COLUMN STATES THE BASIS. Contracted value from the
        subscriptions, not payments received — Phase 1 has no gateway (08 §1).
        A CSV outlives the screen it came from, so the caveat travels with
        every row. Doc 25 · R1.

        One row per workspace rather than only the debtors: a revenue export
        that lists five rows cannot be reconciled against the headline it sits
        under, and reconciling is what somebody opens a CSV to do.
      */
      const live = await getLiveRevenueFigures();
      const figures = live ?? PORTFOLIO_REVENUE;
      const basis = live
        ? 'contracted value · from subscriptions · not payments received'
        : 'designed portfolio · no platform session';
      return {
        filename: `alcassa-revenue-${date}.csv`,
        rows: figures.contracts.length,
        body: toCsv(
          [
            'Basis',
            'Workspace',
            'Slug',
            'Plan',
            'Standing',
            'Contracted monthly (KES)',
            'Unpaid (KES)',
            'Unpaid periods',
            'Days past due',
            'Trial ends',
          ],
          figures.contracts.map((c) => [
            basis,
            c.name,
            c.slug,
            c.subscription?.planName ?? 'none',
            STANDING_LABEL[c.standing],
            c.monthly ?? 'not recorded',
            c.arrears?.amount ?? 0,
            c.arrears?.periods ?? 0,
            c.arrears?.days ?? '',
            c.subscription?.trialEndsAt ? nairobiDate(c.subscription.trialEndsAt) : '',
          ]),
        ),
      };
    }

    case 'audit': {
      const entries = (await getLiveAuditEntries()) ?? (await getAuditEntries());
      return {
        filename: `alcassa-audit-${date}.csv`,
        rows: entries.length,
        body: toCsv(
          ['When', 'Actor', 'Action', 'Target', 'Kind', 'Reason', 'IP', 'Request'],
          entries.map((e: AuditEntry) => [
            e.time,
            e.actor,
            e.action,
            e.target,
            e.kind,
            e.reason,
            e.ip,
            e.requestId,
          ]),
        ),
      };
    }
  }
}
