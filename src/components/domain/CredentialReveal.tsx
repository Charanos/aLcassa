'use client';

import { useState } from 'react';
import { IconAlertTriangle, IconCheck, IconCopy, IconDownload } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';

/**
 * 01 D-11 · 03 §10. "The one screen in the product that shows a secret, and
 * it never shows it again."
 *
 * ⚠ NOT WIRED TO LIVE DATA YET, AND DELIBERATELY NOT DEMONSTRATED WITH A
 * FAKE ONE EITHER. `createCredential` in `app/(tenant)/app/actions.ts`
 * refuses honestly rather than minting a secret, because this is precisely
 * the one screen where a fabricated value would be actively dangerous —
 * someone could copy a "demo" key believing it real. This component exists,
 * fully built to spec, for the day a real secret has somewhere to come from;
 * it is not mounted in the credentials flow until then.
 *
 * No screenshot deterrence, no blur-until-hover, no auto-hide timer — 03
 * §10 calls those "theatre." One clear statement and one deliberate
 * confirmation is the whole mechanism.
 */
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

  function copy() {
    void navigator.clipboard.writeText(secret);
    setCopied(true);
    setAcknowledged(true);
    setTimeout(() => setCopied(false), 1600);
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
      style={{ background: 'var(--surface-sunken)', borderLeft: '3px solid var(--copper-ink)' }}
    >
      <div className="p-5">
        <p className="t-label text-[var(--ink-tertiary)]">{name}</p>
        <p
          className="t-code mt-2 rounded-chip border p-3 break-all"
          style={{
            borderColor: 'var(--rule-base)',
            background: 'var(--surface-raised)',
            color: 'var(--ink-primary)',
          }}
        >
          {secret}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={copy}
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
            borderColor: 'var(--ochre-rule)',
            background: 'var(--ochre-tint)',
            color: 'var(--ochre-ink)',
          }}
        >
          <IconAlertTriangle size={15} stroke={1.5} className="mt-px shrink-0" aria-hidden />
          This is the only time this key will be shown. It is not retrievable after you leave this
          page.
        </p>
      </div>

      <div
        className="flex items-center justify-end border-t px-5 py-3.5"
        style={{ borderColor: 'var(--rule-base)' }}
      >
        <Button variant="primary" disabled={!acknowledged} onClick={onConfirm}>
          I have saved this
        </Button>
      </div>
    </div>
  );
}
