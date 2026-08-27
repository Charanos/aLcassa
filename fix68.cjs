const fs = require('fs');

/** The reason capture, dropped into each dialog's `details` node. */
function reasonField(idPrefix) {
  return `
            <div
              className="grid gap-1.5 border-t pt-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/*
                ⚠ REQUIRED, AND THE CUSTOMER READS IT.

                09 §7: suspension lands in the tenant's own activity log. A
                customer whose writes start failing with no explanation cannot
                tell a billing decision from an outage, so the sentence written
                here is the one that tells them which. The server requires it
                too — a check living only in this dialog is one that a direct
                call to the Server Action skips entirely.
              */}
              <label
                htmlFor="${idPrefix}-reason"
                className="t-label"
                style={{ color: 'var(--text-secondary)' }}
              >
                Reason · the customer sees this
              </label>
              <textarea
                id="${idPrefix}-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Payment overdue since 12 August; invoices sent 1 and 8 August."
                className="rounded-panel border px-3 py-2"
                style={{
                  borderColor: 'var(--rule-base)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                  font: '400 var(--text-sm)/1.5 var(--font-ui)',
                }}
              />
            </div>
`;
}

// ── WorkspaceActions ──────────────────────────────────────────────────────
{
  const p = 'src/components/console/WorkspaceActions.tsx';
  let s = fs.readFileSync(p, 'utf8');
  const crlf = s.includes('\r\n');
  if (crlf) s = s.replace(/\r\n/g, '\n');
  function sub(a, b) {
    if (!s.includes(a)) { console.error('MISS in WorkspaceActions: ' + a.slice(0, 70)); process.exit(1); }
    s = s.replace(a, () => b);
  }

  sub(`  const [suspendError, setSuspendError] = useState<string | null>(null);`,
      `  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [reason, setReason] = useState('');`);

  sub(`      const result = await suspendWorkspace({
        tenantId: workspace.id,
        slug: workspace.slug,
        confirmSlug: typed,
      });
      if (result.ok) {
        setSuspendOpen(false);
      } else {
        setSuspendError(result.error);
      }`,
      `      const result = await suspendWorkspace({
        tenantId: workspace.id,
        slug: workspace.slug,
        confirmSlug: typed,
        reason,
      });
      if (result.ok) {
        setSuspendOpen(false);
        setReason('');
        pushToast({ tone: 'success', message: \`\${workspace.name} is suspended.\` });
      } else {
        setSuspendError(result.error);
      }`);

  // The details node becomes a fragment: the impact counts, then the reason.
  sub(`        details={
          <ul
            className="grid list-none gap-2.5 border-t p-0 pt-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >`,
      `        details={
          <>
          <ul
            className="grid list-none gap-2.5 border-t p-0 pt-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >`);

  sub(`            <li className="t-compact mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              Data is retained. Reactivation restores access immediately and is a single action.
            </li>
          </ul>
        }`,
      `            <li className="t-compact mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              Data is retained. Reactivation restores access immediately and is a single action.
            </li>
          </ul>
` + reasonField('suspend') + `          </>
        }`);

  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(p, s);
  console.log('WorkspaceActions wired');
}

// ── WorkspaceDetailDrawer ─────────────────────────────────────────────────
{
  const p = 'src/components/console/WorkspaceDetailDrawer.tsx';
  let s = fs.readFileSync(p, 'utf8');
  const crlf = s.includes('\r\n');
  if (crlf) s = s.replace(/\r\n/g, '\n');
  const call = `        confirmSlug: typed,
      });`;
  if (!s.includes(call)) { console.error('drawer call anchor missing'); process.exit(1); }
  s = s.replace(call, () => `        confirmSlug: typed,
        reason,
      });`);
  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(p, s);
  console.log('WorkspaceDetailDrawer call updated (state added next)');
}
