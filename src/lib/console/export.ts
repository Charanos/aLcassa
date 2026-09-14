import 'server-only';
import {
  getAuditEntries,
  getRevenue,
  getWorkspaces,
  type AuditEntry,
  type WorkspaceRow,
} from './data';
import { getLiveAuditEntries, getLiveWorkspaces } from './liveWorkspaces';

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
          ['Workspace', 'Slug', 'Status', 'Plan', 'Seats used', 'Seat limit', 'Events', 'Event limit', 'Last activity', 'Created'],
          rows.map((w: WorkspaceRow) => [
            w.name,
            w.slug,
            w.status,
            w.plan,
            w.seatsUsed,
            w.seatsLimit,
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
        ⚠ THE FIRST COLUMN SAYS "designed". There is no payment gateway in
        Phase 1, so every figure in this file is the designed one the screen
        shows. A CSV outlives the screen it came from — it gets mailed,
        pasted into a deck, and read a quarter later by somebody who never
        saw the caveat on the page. The caveat travels with the data.
      */
      const m = await getRevenue();
      return {
        filename: `alcassa-revenue-${date}.csv`,
        rows: m.collections.length,
        body: toCsv(
          ['Source', 'Workspace', 'Slug', 'Invoice', 'Amount', 'Days late', 'Attempts'],
          m.collections.map((c) => [
            'designed — no payment gateway in Phase 1',
            c.name,
            c.slug,
            c.invoice,
            c.amount,
            c.days,
            c.attempts,
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
