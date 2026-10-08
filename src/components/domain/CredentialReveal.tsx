'use client';

import { useState } from 'react';
import { IconAlertTriangle, IconCheck, IconCopy, IconDownload } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';

/** Holds the creation response in memory until the owner acknowledges saving it. */
export function CredentialReveal({
  name,
  secret,
  scopes,
  onConfirm,
}: {
  name: string;
  secret: string;
  scopes: string[];
  onConfirm: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setCopyError(false);
      setAcknowledged(true);
    } catch {
      setCopyError(true);
    }
  }

  function download() {
    const contents = `# ${name}\n# Scopes: ${scopes.join(', ')}\n# This key is shown once. Store it somewhere your team can find it.\nAPI_KEY=${secret}\n`;
    const blob = new Blob([contents], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);
    setAcknowledged(true);
  }

  return (
    <div
      data-slot="credential-reveal"
      className="overflow-hidden rounded-panel"
      style={{ background: 'var(--surface-sunken)', borderLeft: '3px solid var(--blue-500)' }}
    >
      <div className="p-5">
        <p className="t-label text-[var(--text-tertiary)]">{name}</p>
        <p
          className="t-code mt-2 rounded-chip border p-3 break-all"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
          }}
        >
          {secret}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void copy();
            }}
            icon={copied ? <IconCheck /> : <IconCopy />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="secondary" size="sm" onClick={download} icon={<IconDownload />}>
            Download .env
          </Button>
        </div>

        <p
          role="alert"
          className="t-compact mt-4 flex items-start gap-2 rounded-chip border px-3.5 py-2.5"
          style={{
            borderColor: 'color-mix(in oklab, var(--amber-500) 38%, var(--surface-base))',
            background: 'var(--amber-100)',
            color: 'var(--amber-500)',
          }}
        >
          <IconAlertTriangle size={15} stroke={1.5} className="mt-px shrink-0" aria-hidden />
          This is the only time this key will be shown. Store it in your secret manager. It is not
          retrievable after you leave this page.
        </p>
        {copyError ? (
          <p role="alert" className="t-caption mt-3">
            Copy was unavailable. Select the key manually or download it, then store it securely.
          </p>
        ) : null}
        <label className="t-compact mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          I have stored this key securely.
        </label>
      </div>

      <div
        className="flex items-center justify-end border-t px-5 py-3.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Button variant="primary" disabled={!acknowledged} onClick={onConfirm}>
          I have saved this
        </Button>
      </div>
    </div>
  );
}
